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
  renderContractDetail,
  renderCoverage,
  renderErr,
  renderHeader,
  renderInv,
  renderMarkdownScenario,
  renderPost,
  renderPre,
  renderScenarios,
  renderTests,
  renderTitle,
  renderToc,
} from '../../src/domain/index';

const messages = getMessages('en');

function makeContract(overrides: Partial<ParsedContract> = {}): ParsedContract {
  return {
    id: 'test.contract',
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
      contractId: 'test.contract',
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
      id: 'test.flow',
      description: 'Test scenario flow',
      variableName: 'testFlow',
      steps: [
        { index: 0, contractId: 'test.contract', inputLiteral: '{ id: 1 }' },
      ],
      sourceFile: 'test.ts',
      line: 20,
    },
    resolvedSteps: [
      {
        step: {
          index: 0,
          contractId: 'test.contract',
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
        contractId: 'test.contract',
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

  test('renders title without description', () => {
    const lines = expectOk(
      renderTitle([], { title: 'My Docs', description: undefined })
    );
    expect(lines).toContain('# My Docs');
    expect(lines).not.toContain('>');
  });

  test('rejects empty title', () => {
    const error = expectErr(
      renderTitle([], { title: '', description: undefined })
    );
    expect(error.tag).toBe('TitleEmpty');
  });

  test('preserves existing lines', () => {
    const lines = expectOk(
      renderTitle(['existing'], { title: 'Title', description: undefined })
    );
    expect(lines[0]).toBe('existing');
    expect(lines).toContain('# Title');
  });

  test('post: lines increase after transition', () => {
    const before: readonly string[] = [];
    const input = { title: 'Title', description: undefined };
    const after = renderTitle.transition(before, input);
    for (const post of renderTitle.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
  });

  test('invariant: holds on result state', () => {
    const after = renderTitle.transition([], {
      title: 'Title',
      description: undefined,
    });
    for (const inv of renderTitle.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.toc ===

describe('render.toc', () => {
  test('renders TOC for 2+ contracts', () => {
    const contracts = [
      makeLinked(),
      makeLinked({
        contract: makeContract({ id: 'test.other', description: 'Other' }),
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

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const contracts = [
      makeLinked(),
      makeLinked({
        contract: makeContract({ id: 'test.other' }),
      }),
    ];
    const input = { contracts, messages };
    const after = renderToc.transition(before, input);
    for (const post of renderToc.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderToc.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.scenarioSection ===

describe('render.scenarioSection', () => {
  test('renders scenario section', () => {
    const scenarios = [makeLinkedScenario()];
    const lines = expectOk(renderScenarios([], { scenarios, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Scenarios');
    expect(text).toContain('test.flow');
  });

  test('rejects empty scenarios', () => {
    const error = expectErr(renderScenarios([], { scenarios: [], messages }));
    expect(error.tag).toBe('NoScenarios');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { scenarios: [makeLinkedScenario()], messages };
    const after = renderScenarios.transition(before, input);
    for (const post of renderScenarios.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderScenarios.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.contractHeader ===

describe('render.contractHeader', () => {
  test('renders contract header', () => {
    const lines = expectOk(
      renderHeader([], { linked: makeLinked(), messages })
    );
    const text = lines.join('\n');
    expect(text).toContain('test.contract');
    expect(text).toContain('TestState');
  });

  test('rejects empty contract id', () => {
    const error = expectErr(
      renderHeader([], {
        linked: makeLinked({ contract: makeContract({ id: '' }) }),
        messages,
      })
    );
    expect(error.tag).toBe('TitleEmpty');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { linked: makeLinked(), messages };
    const after = renderHeader.transition(before, input);
    for (const post of renderHeader.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderHeader.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.preconditions ===

describe('render.preconditions', () => {
  test('renders preconditions', () => {
    const guards = makeContract().guards;
    const lines = expectOk(renderPre([], { guards, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Preconditions');
    expect(text).toContain('state must exist');
  });

  test('renders empty preconditions', () => {
    const lines = expectOk(renderPre([], { guards: [], messages }));
    const text = lines.join('\n');
    expect(text).toContain('Preconditions');
    expect(text).toContain('Not defined');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { guards: makeContract().guards, messages };
    const after = renderPre.transition(before, input);
    for (const post of renderPre.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderPre.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.postconditions ===

describe('render.postconditions', () => {
  test('renders postconditions', () => {
    const conditions = makeContract().conditions;
    const lines = expectOk(renderPost([], { conditions, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Postconditions');
    expect(text).toContain('count increases by 1');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { conditions: makeContract().conditions, messages };
    const after = renderPost.transition(before, input);
    for (const post of renderPost.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderPost.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.invariants ===

describe('render.invariants', () => {
  test('renders invariants', () => {
    const invariants = makeContract().invariants;
    const lines = expectOk(renderInv([], { invariants, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Invariants');
    expect(text).toContain('quantity is positive');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { invariants: makeContract().invariants, messages };
    const after = renderInv.transition(before, input);
    for (const post of renderInv.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderInv.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.errorCatalog ===

describe('render.errorCatalog', () => {
  test('renders error catalog', () => {
    const guards = makeContract().guards;
    const lines = expectOk(renderErr([], { guards, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Error Catalog');
    expect(text).toContain('NotFound');
  });

  test('renders empty error catalog', () => {
    const lines = expectOk(renderErr([], { guards: [], messages }));
    const text = lines.join('\n');
    expect(text).toContain('No errors defined');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { guards: makeContract().guards, messages };
    const after = renderErr.transition(before, input);
    for (const post of renderErr.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderErr.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.testExamples ===

describe('render.testExamples', () => {
  test('renders test examples', () => {
    const linked = makeLinked();
    const lines = expectOk(
      renderTests([], { tests: linked.testSuite, messages })
    );
    const text = lines.join('\n');
    expect(text).toContain('Test Cases');
    expect(text).toContain('succeeds when state exists');
  });

  test('renders no tests message', () => {
    const lines = expectOk(renderTests([], { tests: undefined, messages }));
    const text = lines.join('\n');
    expect(text).toContain('No tests found');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { tests: makeLinked().testSuite, messages };
    const after = renderTests.transition(before, input);
    for (const post of renderTests.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderTests.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.coverageSummary ===

describe('render.coverageSummary', () => {
  test('renders coverage summary', () => {
    const report = makeCoverageReport();
    const lines = expectOk(renderCoverage([], { report, messages }));
    const text = lines.join('\n');
    expect(text).toContain('Test Coverage');
    expect(text).toContain('test.contract');
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = { report: makeCoverageReport(), messages };
    const after = renderCoverage.transition(before, input);
    for (const post of renderCoverage.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderCoverage.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === render.contractDetail ===

describe('render.contractDetail', () => {
  test('renders all contract sections', () => {
    const contracts = [makeLinked()];
    const lines = expectOk(
      renderContractDetail([], {
        contracts,
        hasScenarios: false,
        messages,
      })
    );
    const text = lines.join('\n');
    expect(text).toContain('test.contract');
    expect(text).toContain('Preconditions');
    expect(text).toContain('Postconditions');
    expect(text).toContain('Invariants');
    expect(text).toContain('Error Catalog');
    expect(text).toContain('Test Cases');
  });

  test('adds contract detail header when scenarios exist', () => {
    const contracts = [makeLinked()];
    const lines = expectOk(
      renderContractDetail([], {
        contracts,
        hasScenarios: true,
        messages,
      })
    );
    const text = lines.join('\n');
    expect(text).toContain('Contract Details');
  });

  test('handles empty contracts', () => {
    const lines = expectOk(
      renderContractDetail([], {
        contracts: [],
        hasScenarios: false,
        messages,
      })
    );
    expect(lines.length).toBe(0);
  });

  test('post/invariant: hold after transition', () => {
    const before: readonly string[] = [];
    const input = {
      contracts: [makeLinked()],
      hasScenarios: false,
      messages,
    };
    const after = renderContractDetail.transition(before, input);
    for (const post of renderContractDetail.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of renderContractDetail.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });

  test('post: empty contracts do not decrease lines', () => {
    const before: readonly string[] = ['existing'];
    const input = {
      contracts: [],
      hasScenarios: false,
      messages,
    };
    const after = renderContractDetail.transition(before, input);
    for (const post of renderContractDetail.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
  });
});

// === render.markdown scenario ===

describe('render.markdown scenario', () => {
  test('renders complete markdown', () => {
    const contracts = [makeLinked()];
    const scenarios = [makeLinkedScenario()];

    const result = renderMarkdownScenario([], {
      title: 'My Docs',
      description: 'Description',
      contracts,
      scenarios,
      messages,
      coverageReport: undefined,
    });

    const lines = expectOk(result);
    const text = lines.join('\n');
    expect(text).toContain('# My Docs');
    expect(text).toContain('Scenarios');
    expect(text).toContain('test.contract');
  });

  test('renders without scenarios', () => {
    const contracts = [makeLinked()];

    const result = renderMarkdownScenario([], {
      title: 'My Docs',
      description: undefined,
      contracts,
      scenarios: [],
      messages,
      coverageReport: undefined,
    });

    const lines = expectOk(result);
    const text = lines.join('\n');
    expect(text).toContain('# My Docs');
    expect(text).not.toContain('Scenarios');
  });

  test('renders with coverage', () => {
    const contracts = [makeLinked()];
    const report = makeCoverageReport();

    const result = renderMarkdownScenario([], {
      title: 'My Docs',
      description: undefined,
      contracts,
      scenarios: [],
      messages,
      coverageReport: report,
    });

    const lines = expectOk(result);
    const text = lines.join('\n');
    expect(text).toContain('Test Coverage');
  });

  test('parity: matches existing renderMarkdown output', () => {
    const contracts = [
      makeLinked(),
      makeLinked({
        contract: makeContract({
          id: 'test.other',
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

    const expected = renderMarkdown(model, { messages, coverageReport });

    const result = renderMarkdownScenario([], {
      title: 'Parity Test',
      description: 'Testing parity',
      contracts,
      scenarios,
      messages,
      coverageReport,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const actual = result.value.join('\n').replace(/\n{3,}/g, '\n\n');
      expect(actual).toBe(expected);
    }
  });

  test('exposes contract metadata', () => {
    expect(renderTitle.id).toBe('render.title');
    expect(renderToc.id).toBe('render.toc');
    expect(renderMarkdownScenario.id).toBe('render.markdown');
    expect(renderContractDetail.id).toBe('render.contractDetail');
  });
});
