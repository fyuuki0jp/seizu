import { define, err, pass, scenario, step } from 'kata';
import { renderCoverageSummary } from '../doc/renderer/coverage-section';
import { renderScenarioSection } from '../doc/renderer/scenario-section';
import {
  renderContractHeader,
  renderErrorCatalog,
  renderInvariants,
  renderPostconditions,
  renderPreconditions,
  renderTestExamples,
} from '../doc/renderer/sections';
import type {
  ContractDetailInput,
  ContractHeaderInput,
  CoverageSectionInput,
  ErrorCatalogInput,
  InvariantsInput,
  MarkdownInput,
  PostconditionsInput,
  PreconditionsInput,
  RenderError,
  ScenarioSectionInput,
  TestExamplesInput,
  TitleInput,
  TocInput,
} from './types';

// === render.title ===

export const renderTitle = define<readonly string[], TitleInput, RenderError>({
  id: 'render.title',
  pre: [
    /** Title must not be empty */
    (_, input) =>
      input.title.length > 0 ? pass : err({ tag: 'TitleEmpty' as const }),
  ],
  transition: (lines, input) => {
    const result = [...lines, `# ${input.title}`, ''];
    if (input.description) {
      return [...result, `> ${input.description}`, ''];
    }
    return result;
  },
  post: [
    /** Output lines increase after title is added */
    (before, after) => after.length > before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.toc ===

export const renderToc = define<readonly string[], TocInput, RenderError>({
  id: 'render.toc',
  pre: [
    /** At least 2 contracts are required for table of contents */
    (_, input) =>
      input.contracts.length >= 2
        ? pass
        : err({ tag: 'InsufficientContracts' as const }),
  ],
  transition: (lines, input) => {
    const { contracts, messages } = input;
    const result = [...lines];
    result.push(`## ${messages.toc.title}`);
    result.push('');

    for (const linked of contracts) {
      const { contract } = linked;
      const firstLine = contract.description?.split('\n')[0]?.trim();
      const testCount = linked.testSuite?.tests.length ?? 0;
      const guardCount = contract.guards.length;

      const label = firstLine
        ? `**${contract.id}** - ${firstLine}`
        : `**${contract.id}**`;
      const meta = messages.toc.meta(guardCount, testCount);

      result.push(`- ${label} （${meta}）`);
    }

    result.push('');
    return result;
  },
  post: [
    /** Output lines increase after TOC is added */
    (before, after) => after.length > before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.scenarioSection ===

export const renderScenarios = define<
  readonly string[],
  ScenarioSectionInput,
  RenderError
>({
  id: 'render.scenarioSection',
  pre: [
    /** At least one scenario must exist */
    (_, input) =>
      input.scenarios.length > 0 ? pass : err({ tag: 'NoScenarios' as const }),
  ],
  transition: (lines, input) => [
    ...lines,
    ...renderScenarioSection(input.scenarios, input.messages).split('\n'),
  ],
  post: [
    /** Output lines increase after scenario section */
    (before, after) => after.length > before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.contractHeader ===

export const renderHeader = define<
  readonly string[],
  ContractHeaderInput,
  RenderError
>({
  id: 'render.contractHeader',
  pre: [
    /** Contract ID must not be empty */
    (_, input) =>
      input.linked.contract.id.length > 0
        ? pass
        : err({ tag: 'TitleEmpty' as const }),
  ],
  transition: (lines, input) => [
    ...lines,
    ...renderContractHeader(input.linked, input.messages).split('\n'),
  ],
  post: [
    /** Output lines increase after header is added */
    (before, after) => after.length > before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.preconditions ===

export const renderPre = define<readonly string[], PreconditionsInput, never>({
  id: 'render.preconditions',
  pre: [],
  transition: (lines, input) => [
    ...lines,
    ...renderPreconditions(input.guards, input.messages).split('\n'),
  ],
  post: [
    /** Output lines do not decrease */
    (before, after) => after.length >= before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.postconditions ===

export const renderPost = define<readonly string[], PostconditionsInput, never>(
  {
    id: 'render.postconditions',
    pre: [],
    transition: (lines, input) => [
      ...lines,
      ...renderPostconditions(input.conditions, input.messages).split('\n'),
    ],
    post: [
      /** Output lines do not decrease */
      (before, after) => after.length >= before.length,
    ],
    invariant: [
      /** Lines array is never negative length */
      (state) => state.length >= 0,
    ],
  }
);

// === render.invariants ===

export const renderInv = define<readonly string[], InvariantsInput, never>({
  id: 'render.invariants',
  pre: [],
  transition: (lines, input) => [
    ...lines,
    ...renderInvariants(input.invariants, input.messages).split('\n'),
  ],
  post: [
    /** Output lines do not decrease */
    (before, after) => after.length >= before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.errorCatalog ===

export const renderErr = define<readonly string[], ErrorCatalogInput, never>({
  id: 'render.errorCatalog',
  pre: [],
  transition: (lines, input) => [
    ...lines,
    ...renderErrorCatalog(input.guards, input.messages).split('\n'),
  ],
  post: [
    /** Output lines do not decrease */
    (before, after) => after.length >= before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.testExamples ===

export const renderTests = define<readonly string[], TestExamplesInput, never>({
  id: 'render.testExamples',
  pre: [],
  transition: (lines, input) => [
    ...lines,
    ...renderTestExamples(input.tests?.tests, input.messages).split('\n'),
  ],
  post: [
    /** Output lines do not decrease */
    (before, after) => after.length >= before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.coverageSummary ===

export const renderCoverage = define<
  readonly string[],
  CoverageSectionInput,
  never
>({
  id: 'render.coverageSummary',
  pre: [],
  transition: (lines, input) => [
    ...lines,
    '---',
    '',
    ...renderCoverageSummary(input.report, input.messages).split('\n'),
  ],
  post: [
    /** Output lines increase after coverage section */
    (before, after) => after.length > before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.contractDetail ===

export const renderContractDetail = define<
  readonly string[],
  ContractDetailInput,
  never
>({
  id: 'render.contractDetail',
  pre: [],
  transition: (lines, input) => {
    const { contracts, hasScenarios, messages } = input;
    const sorted = [...contracts].sort((a, b) =>
      a.contract.id.localeCompare(b.contract.id)
    );
    const current = [...lines];

    if (sorted.length > 0 && hasScenarios) {
      current.push('---', '', `## ${messages.contractDetail.sectionTitle}`, '');
    }

    for (const linked of sorted) {
      current.push('---', '');
      current.push(...renderContractHeader(linked, messages).split('\n'));
      current.push(
        ...renderPreconditions(linked.contract.guards, messages).split('\n')
      );
      current.push(
        ...renderPostconditions(linked.contract.conditions, messages).split(
          '\n'
        )
      );
      current.push(
        ...renderInvariants(linked.contract.invariants, messages).split('\n')
      );
      current.push(
        ...renderErrorCatalog(linked.contract.guards, messages).split('\n')
      );
      current.push(
        ...renderTestExamples(linked.testSuite?.tests, messages).split('\n')
      );
    }

    return current;
  },
  post: [
    /** Non-empty contracts increase output lines */
    (before, after, input) =>
      input.contracts.length > 0
        ? after.length > before.length
        : after.length >= before.length,
  ],
  invariant: [
    /** Lines array is never negative length */
    (state) => state.length >= 0,
  ],
});

// === render.markdown scenario ===

export const renderMarkdownScenario = scenario<
  readonly string[],
  MarkdownInput
>({
  id: 'render.markdown',
  description: 'Markdown ドキュメント全体の組み立て',
  flow: (input) => {
    const steps = [];

    // 1. Title (always)
    steps.push(
      step(renderTitle, {
        title: input.title,
        description: input.description,
      })
    );

    // 2. Scenario section (if scenarios exist)
    if (input.scenarios.length > 0) {
      steps.push(
        step(renderScenarios, {
          scenarios: input.scenarios,
          messages: input.messages,
        })
      );
    }

    // 3. TOC (if 2+ contracts)
    const sorted = [...input.contracts].sort((a, b) =>
      a.contract.id.localeCompare(b.contract.id)
    );
    if (sorted.length > 1) {
      steps.push(
        step(renderToc, {
          contracts: sorted,
          messages: input.messages,
        })
      );
    }

    // 4. Contract details
    steps.push(
      step(renderContractDetail, {
        contracts: input.contracts,
        hasScenarios: input.scenarios.length > 0,
        messages: input.messages,
      })
    );

    // 5. Coverage (if report exists)
    if (input.coverageReport) {
      steps.push(
        step(renderCoverage, {
          report: input.coverageReport,
          messages: input.messages,
        })
      );
    }

    return steps;
  },
});
