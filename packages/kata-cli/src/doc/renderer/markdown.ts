import type { CoverageReport } from '../analyzer/coverage-types';
import type { Messages } from '../i18n/types';
import type { DocumentModel, LinkedContract } from '../types';
import { renderCoverageSummary } from './coverage-section';
import {
  renderContractHeader,
  renderErrorCatalog,
  renderInvariants,
  renderPostconditions,
  renderPreconditions,
  renderTestExamples,
} from './sections';

export interface RenderOptions {
  readonly messages: Messages;
  readonly coverageReport?: CoverageReport;
}

/**
 * Render a DocumentModel into a complete Markdown string.
 * Deterministic: same input always produces the same output.
 */
export function renderMarkdown(
  model: DocumentModel,
  options: RenderOptions
): string {
  const { messages } = options;
  const lines: string[] = [];

  lines.push(`# ${model.title}`);
  lines.push('');

  if (model.description) {
    lines.push(`> ${model.description}`);
    lines.push('');
  }

  const sorted = [...model.contracts].sort((a, b) =>
    a.contract.id.localeCompare(b.contract.id)
  );

  if (sorted.length > 1) {
    lines.push(renderTableOfContents(sorted, messages));
  }

  for (let i = 0; i < sorted.length; i++) {
    const linked = sorted[i];

    lines.push('---');
    lines.push('');

    lines.push(renderContractHeader(linked, messages));
    lines.push(renderPreconditions(linked.contract.guards, messages));
    lines.push(renderPostconditions(linked.contract.conditions, messages));
    lines.push(renderInvariants(linked.contract.invariants, messages));
    lines.push(renderErrorCatalog(linked.contract.guards, messages));
    lines.push(renderTestExamples(linked.testSuite?.tests, messages));
  }

  if (options.coverageReport) {
    lines.push('---');
    lines.push('');
    lines.push(renderCoverageSummary(options.coverageReport, messages));
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function renderTableOfContents(
  contracts: LinkedContract[],
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`## ${messages.toc.title}`);
  lines.push('');

  for (const linked of contracts) {
    const { contract } = linked;
    const firstLine = contract.description?.split('\n')[0]?.trim();
    const testCount = linked.testSuite?.tests.length ?? 0;
    const guardCount = contract.guards.length;

    const label = firstLine
      ? `**${contract.id}** - ${firstLine}`
      : `**${contract.id}**`;
    const meta = messages.toc.meta(guardCount, testCount);

    lines.push(`- ${label} （${meta}）`);
  }

  lines.push('');
  return lines.join('\n');
}
