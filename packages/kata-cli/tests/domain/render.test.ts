import { isOk } from 'kata';
import { expectErr, expectOk } from 'kata/testing';
import { describe, expect, test } from 'vitest';
import type { CoverageReport } from '../../src/doc/analyzer/coverage-types';
import { getMessages } from '../../src/doc/i18n/index';
import { renderMarkdown } from '../../src/doc/renderer/markdown';
import type {
  DocumentModel,
  LinkedContract,
  LinkedScenario,
  ParsedContract,
} from '../../src/doc/types';
import {
  renderContractSections,
  renderCoverageSection,
  renderMarkdownScenario,
  renderScenarios,
  renderTitle,
  renderToc,
} from '../../src/domain/index';

const messages = getMessages('en');

function makeContract(overrides: Partial<ParsedContract> = {}): ParsedContract {
  return {
    name: 'test.contract',
    accepts: [],
    description: 'Test contract description',
    typeInfo: {
      stateTypeName: 'TestState',
      inputTypeName: 'TestInput',
      errorTypeName: 'TestError',
    },
    guards: [
      {
        index: 0,
        description: 'state must exist',
        errorTags: ['NotFound'],
        kind: 'inline',
        referenceName: undefined,
      },
    ],
    conditions: [
      {
        index: 0,
        description: 'count increases by 1',
        kind: 'inline',
        referenceName: undefined,
      },
    ],
    invariants: [
      {
        index: 0,
        description: 'quantity is positive',
        kind: 'inline',
        referenceName: undefined,
      },
    ],
    variableName: 'testContract',
    sourceFile: 'test.ts',
    line: 1,
    ...overrides,
  };
}

function makeLinked(overrides: Partial<LinkedContract> = {}): LinkedContract {
  return {
    contract: makeContract(),
    testSuite: {
      contractName: 'test.contract',
      tests: [
        {
          name: 'succeeds when state exists',
          classification: 'success',
          sourceFile: 'test.test.ts',
          line: 5,
        },
        {
          name: 'returns NotFound when missing',
          classification: 'failure',
          sourceFile: 'test.test.ts',
          line: 10,
        },
      ],
      sourceFile: 'test.test.ts',
    },
    ...overrides,
  };
}

function makeLinkedScenario(): LinkedScenario {
  return {
    scenario: {
      name: 'test.flow',
      accepts: [],
      description: 'Test scenario flow',
      variableName: 'testFlow',
      steps: [
        { index: 0, contractName: 'test.contract', inputLiteral: '{ id: 1 }' },
      ],
      sourceFile: 'test.ts',
      line: 20,
    },
    resolvedSteps: [
      {
        step: {
          index: 0,
          contractName: 'test.contract',
          inputLiteral: '{ id: 1 }',
        },
        contract: makeContract(),
      },
    ],
  };
}

function makeCoverageReport(): CoverageReport {
  return {
    contracts: [
      {
        contractName: 'test.contract',
        hasTests: true,
        testCount: 2,
        successTestCount: 1,
        failureTestCount: 1,
        errorTags: [
          {
            tag: 'NotFound',
            guardIndex: 0,
            hasFailureTest: true,
            matchingTestName: 'returns NotFound when missing',
          },
        ],
        coveredErrorTags: 1,
        totalErrorTags: 1,
      },
    ],
    summary: {
      totalContracts: 1,
      testedContracts: 1,
      untestedContracts: 0,
      contractCoveragePercent: 100,
      totalErrorTags: 1,
      coveredErrorTags: 1,
      errorTagCoveragePercent: 100,
    },
  };
}

// === render.title ===

describe('render.title', () => {
  test('renders title with description', () => {
    const lines = expectOk(
      renderTitle([], { title: 'My Docs', description: 'A description' })
    );
    expect(lines).toContain('# My Docs');
    expect(lines).toContain('> A description');
  });

  test('rejects empty title', () => {
    const error = expectErr(
      renderTitle([], { title: '', description: undefined })
    );
    expect(error.tag).toBe('TitleEmpty');
  });

  test('post: lines increase after transition', () => {
    const before: readonly string[] = [];
    const input = { title: 'Title', description: undefined };
    const after = renderTitle.transition(before, input);
    for (const post of renderTitle.post ?? []) {
      expect(post.fn(before, after, input)).toBe(true);
    }
  });
});

// === render.toc ===

describe('render.toc', () => {
  test('renders TOC for 2+ contracts', () => {
    const contracts = [
      makeLinked(),
      makeLinked({
        contract: makeContract({ name: 'test.other', description: 'Other' }),
      }),
    ];
    const lines = expectOk(renderToc([], { contracts, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Table of Contents');
    expect(text).toContain('test.contract');
    expect(text).toContain('test.other');
  });

  test('rejects fewer than 2 contracts', () => {
    const error = expectErr(
      renderToc([], { contracts: [makeLinked()], messages })
    );
    expect(error.tag).toBe('InsufficientContracts');
  });

  test('post: lines increase after transition', () => {
    const before: readonly string[] = [];
    const input = {
      contracts: [
        makeLinked(),
        makeLinked({ contract: makeContract({ name: 'test.other' }) }),
      ],
      messages,
    };
    const after = renderToc.transition(before, input);
    for (const post of renderToc.post ?? []) {
      expect(post.fn(before, after, input)).toBe(true);
    }
  });
});

// === render.scenarioSection ===

describe('render.scenarioSection', () => {
  test('renders scenario section', () => {
    const scenarios = [makeLinkedScenario()];
    const lines = expectOk(
      renderScenarios([], { scenarios, messages, flowEnabled: true })
    );
    const text = lines.join('\n');
    expect(text).toContain('Scenarios');
    expect(text).toContain('test.flow');
  });

  test('rejects empty scenarios', () => {
    const error = expectErr(
      renderScenarios([], { scenarios: [], messages, flowEnabled: true })
    );
    expect(error.tag).toBe('NoScenarios');
  });
});

// === pure section renderers ===

describe('render pure sections', () => {
  test('renders accepts section when contract has accepts', () => {
    const contractWithAccepts = makeContract({
      accepts: ['Users can create accounts', 'Users can log in'],
    });
    const lines = renderContractSections([], {
      contracts: [{ contract: contractWithAccepts, testSuite: undefined }],
      hasScenarios: false,
      messages,
      flowEnabled: true,
    });
    const text = lines.join('\n');
    expect(text).toContain('### Acceptance Criteria');
    expect(text).toContain('- Users can create accounts');
    expect(text).toContain('- Users can log in');
  });

  test('does not render accepts section when accepts is empty', () => {
    const lines = renderContractSections([], {
      contracts: [makeLinked()],
      hasScenarios: false,
      messages,
      flowEnabled: true,
    });
    const text = lines.join('\n');
    expect(text).not.toContain('Acceptance Criteria');
  });

  test('renders heading, accepts, then type table in order', () => {
    const contractWithAccepts = makeContract({
      name: 'order.test',
      accepts: ['Requirement 1'],
    });
    const lines = renderContractSections([], {
      contracts: [{ contract: contractWithAccepts, testSuite: undefined }],
      hasScenarios: false,
      messages,
      flowEnabled: true,
    });
    const text = lines.join('\n');
    const headingPos = text.indexOf('## order.test');
    const acceptsPos = text.indexOf('### Acceptance Criteria');
    const typeTablePos = text.indexOf('| Property |');
    expect(headingPos).toBeLessThan(acceptsPos);
    expect(acceptsPos).toBeLessThan(typeTablePos);
  });

  test('renders all contract detail sections', () => {
    const lines = renderContractSections([], {
      contracts: [makeLinked()],
      hasScenarios: false,
      messages,
      flowEnabled: true,
    });
    const text = lines.join('\n');
    expect(text).toContain('test.contract');
    expect(text).toContain('Preconditions');
    expect(text).toContain('Postconditions');
    expect(text).toContain('Invariants');
    expect(text).toContain('Error Catalog');
    expect(text).toContain('Test Cases');
  });

  test('renders coverage summary section', () => {
    const lines = renderCoverageSection([], {
      report: makeCoverageReport(),
      messages,
    });
    const text = lines.join('\n');
    expect(text).toContain('Test Coverage');
    expect(text).toContain('test.contract');
  });
});

// === render.markdown scenario ===

describe('render.markdown scenario', () => {
  test('renders title and optional sections', () => {
    const result = renderMarkdownScenario([], {
      title: 'My Docs',
      description: 'Description',
      flowEnabled: true,
      contracts: [
        makeLinked(),
        makeLinked({ contract: makeContract({ name: 'x' }) }),
      ],
      scenarios: [makeLinkedScenario()],
      messages,
    });

    const lines = expectOk(result);
    const text = lines.join('\n');
    expect(text).toContain('# My Docs');
    expect(text).toContain('Scenarios');
    expect(text).toContain('Table of Contents');
  });

  test('parity: scenario prelude + pure sections matches renderMarkdown', () => {
    const contracts = [
      makeLinked(),
      makeLinked({
        contract: makeContract({
          name: 'test.other',
          description: 'Other contract',
          guards: [],
          conditions: [],
          invariants: [],
        }),
        testSuite: undefined,
      }),
    ];
    const scenarios = [makeLinkedScenario()];
    const coverageReport = makeCoverageReport();

    const model: DocumentModel = {
      title: 'Parity Test',
      description: 'Testing parity',
      contracts,
      scenarios,
      sourceFiles: ['test.ts'],
    };

    const expectedResult = renderMarkdown(model, { messages, coverageReport });
    if (!isOk(expectedResult)) throw new Error('render failed');
    const expected = expectedResult.value;
    const prelude = renderMarkdownScenario([], {
      title: model.title,
      description: model.description,
      flowEnabled: true,
      contracts,
      scenarios,
      messages,
    });

    expect(isOk(prelude)).toBe(true);
    if (isOk(prelude)) {
      const detailed = renderContractSections(prelude.value, {
        contracts,
        hasScenarios: scenarios.length > 0,
        messages,
        flowEnabled: true,
      });
      const withCoverage = renderCoverageSection(detailed, {
        report: coverageReport,
        messages,
      });
      const actual = withCoverage.join('\n').replace(/\n{3,}/g, '\n\n');
      expect(actual).toBe(expected);
    }
  });

  test('exposes contract metadata', () => {
    expect(renderTitle.name).toBe('render.title');
    expect(renderToc.name).toBe('render.toc');
    expect(renderScenarios.name).toBe('render.scenarioSection');
    expect(renderMarkdownScenario.name).toBe('render.markdown');
  });
});
