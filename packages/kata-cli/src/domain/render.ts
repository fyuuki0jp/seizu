import { define, err, pass, scenario, step } from 'kata';
import { renderCoverageSummary } from '../doc/renderer/coverage-section';
import { renderFlowSection } from '../doc/renderer/flow-section';
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
  CoverageSectionInput,
  MarkdownInput,
  RenderError,
  ScenarioSectionInput,
  TitleInput,
  TocInput,
} from './types';

// === render.title ===

export const renderTitle = define<readonly string[], TitleInput, RenderError>({
  id: 'render.title',
  pre: [
    /** Document title must not be empty. */
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
    /** Rendering a title always appends new lines. */
    (before, after) => after.length > before.length,
  ],
});

// === render.toc ===

export const renderToc = define<readonly string[], TocInput, RenderError>({
  id: 'render.toc',
  pre: [
    /** TOC is meaningful only when two or more contracts are present. */
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
    /** Rendering TOC appends lines to the existing output. */
    (before, after) => after.length > before.length,
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
    /** Scenario section requires at least one parsed scenario. */
    (_, input) =>
      input.scenarios.length > 0 ? pass : err({ tag: 'NoScenarios' as const }),
  ],
  transition: (lines, input) => [
    ...lines,
    ...renderScenarioSection(input.scenarios, input.messages, {
      flowEnabled: input.flowEnabled,
    }).split('\n'),
  ],
  post: [
    /** Rendering scenario section appends lines to the existing output. */
    (before, after) => after.length > before.length,
  ],
});

export function renderContractSections(
  lines: readonly string[],
  input: ContractDetailInput
): readonly string[] {
  const { contracts, hasScenarios, messages, flowEnabled } = input;
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
    if (flowEnabled && linked.contract.flow) {
      current.push(
        ...renderFlowSection(linked.contract.flow, messages).split('\n')
      );
    }
    current.push(
      ...renderPreconditions(linked.contract.guards, messages).split('\n')
    );
    current.push(
      ...renderPostconditions(linked.contract.conditions, messages).split('\n')
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
}

export function renderCoverageSection(
  lines: readonly string[],
  input: CoverageSectionInput
): readonly string[] {
  return [
    ...lines,
    '---',
    '',
    ...renderCoverageSummary(input.report, input.messages).split('\n'),
  ];
}

// === render.markdown scenario ===

export const renderMarkdownScenario = scenario<
  readonly string[],
  MarkdownInput
>({
  id: 'render.markdown',
  description: 'Markdown ドキュメントの前半組み立て',
  flow: (input) => {
    const steps = [];

    steps.push(
      step(renderTitle, {
        title: input.title,
        description: input.description,
      })
    );

    if (input.scenarios.length > 0) {
      steps.push(
        step(renderScenarios, {
          scenarios: input.scenarios,
          messages: input.messages,
          flowEnabled: input.flowEnabled,
        })
      );
    }

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

    return steps;
  },
});
