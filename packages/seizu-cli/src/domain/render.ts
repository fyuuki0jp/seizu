import { check, define, err, guard, pass, scenario, step } from 'seizu';
import { renderCoverageSummary } from '../doc/renderer/coverage-section';
import { renderFlowSection } from '../doc/renderer/flow-section';
import { renderScenarioSection } from '../doc/renderer/scenario-section';
import {
  renderAccepts,
  renderContractHeading,
  renderErrorCatalog,
  renderInvariants,
  renderPostconditions,
  renderPreconditions,
  renderTestExamples,
  renderTypeTable,
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

/** @accepts ドキュメントのタイトルと説明をレンダリングできる */
export const renderTitle = define<readonly string[], TitleInput, RenderError>(
  'render.title',
  {
    pre: [
      guard('document title must not be empty', (_, input) =>
        input.title.length > 0 ? pass : err({ tag: 'TitleEmpty' as const })
      ),
    ],
    transition: (lines, input) => {
      const result = [...lines, `# ${input.title}`, ''];
      if (input.description) {
        return [...result, `> ${input.description}`, ''];
      }
      return result;
    },
    post: [
      check(
        'rendering a title always appends new lines',
        (before, after) =>
          after.length > before.length || 'no lines were appended'
      ),
    ],
  }
);

// === render.toc ===

/** @accepts 2つ以上のContractがある場合に目次を生成できる */
export const renderToc = define<readonly string[], TocInput, RenderError>(
  'render.toc',
  {
    pre: [],
    transition: (lines, input) => {
      const { contracts, messages } = input;
      if (contracts.length < 2) {
        return lines;
      }
      const result = [...lines];
      result.push(`## ${messages.toc.title}`);
      result.push('');

      for (const linked of contracts) {
        const { contract } = linked;
        const firstLine = contract.description?.split('\n')[0]?.trim();
        const testCount = linked.testSuite?.tests.length ?? 0;
        const guardCount = contract.guards.length;

        const label = firstLine
          ? `**${contract.name}** - ${firstLine}`
          : `**${contract.name}**`;
        const meta = messages.toc.meta(guardCount, testCount);

        result.push(`- ${label} （${meta}）`);
      }

      result.push('');
      return result;
    },
    post: [
      check(
        'rendering TOC appends lines only when two or more contracts are present',
        (before, after, input) =>
          input.contracts.length >= 2
            ? after.length > before.length || 'no lines were appended'
            : after.length === before.length ||
              'TOC should not render with fewer than two contracts'
      ),
    ],
  }
);

// === render.scenarioSection ===

/** @accepts シナリオセクションをレンダリングできる */
export const renderScenarios = define<
  readonly string[],
  ScenarioSectionInput,
  RenderError
>('render.scenarioSection', {
  pre: [],
  transition: (lines, input) =>
    input.scenarios.length === 0
      ? lines
      : [
          ...lines,
          ...renderScenarioSection(input.scenarios, input.messages, {
            flowEnabled: input.flowEnabled,
          }).split('\n'),
        ],
  post: [
    check(
      'rendering scenario section appends lines only when scenarios exist',
      (before, after, input) =>
        input.scenarios.length > 0
          ? after.length > before.length || 'no lines were appended'
          : after.length === before.length ||
            'scenario section should not render without scenarios'
    ),
  ],
});

export function renderContractSections(
  lines: readonly string[],
  input: ContractDetailInput
): readonly string[] {
  const { contracts, hasScenarios, messages, flowEnabled } = input;
  const sorted = [...contracts].sort((a, b) =>
    a.contract.name.localeCompare(b.contract.name)
  );
  const current = [...lines];

  if (sorted.length > 0 && hasScenarios) {
    current.push('---', '', `## ${messages.contractDetail.sectionTitle}`, '');
  }

  for (const linked of sorted) {
    current.push('---', '');
    current.push(...renderContractHeading(linked).split('\n'));
    current.push(
      ...renderAccepts(linked.contract.accepts, messages).split('\n')
    );
    current.push(...renderTypeTable(linked, messages).split('\n'));
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

/** @accepts タイトル・シナリオ・目次をMarkdownとして組み立てられる */
export const renderMarkdownScenario = scenario(
  'render.markdown',
  (input: MarkdownInput) => {
    return [
      step(renderTitle, {
        title: input.title,
        description: input.description,
      }),
      step(renderScenarios, {
        scenarios: input.scenarios,
        messages: input.messages,
        flowEnabled: input.flowEnabled,
      }),
      step(renderToc, {
        contracts: [...input.contracts].sort((a, b) =>
          a.contract.name.localeCompare(b.contract.name)
        ),
        messages: input.messages,
      }),
    ];
  }
);
