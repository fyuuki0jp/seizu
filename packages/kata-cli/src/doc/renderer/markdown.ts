import type { CoverageReport } from '../analyzer/coverage-types';
import type { Messages } from '../i18n/types';
import type { DocumentModel, LinkedContract } from '../types';
import { renderCoverageSummary } from './coverage-section';
import { renderScenarioSection } from './scenario-section';
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
 *
 * Structure:
 *   # Title
 *   ## Scenarios          (if scenarios exist)
 *   ## Table of Contents  (if 2+ contracts)
 *   ## Contract Details   (each contract)
 *   ## Coverage           (if coverageReport)
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

  // Scenario layer (Use Case)
  if (model.scenarios.length > 0) {
    lines.push(renderScenarioSection(model.scenarios, messages));
  }

  const sorted = [...model.contracts].sort((a, b) =>
    a.contract.id.localeCompare(b.contract.id)
  );

  // Table of contents (if 2+ contracts)
  if (sorted.length > 1) {
    lines.push(renderTableOfContents(sorted, messages));
  }

  // Contract detail layer (Domain)
  if (sorted.length > 0 && model.scenarios.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${messages.contractDetail.sectionTitle}`);
    lines.push('');
  }

  for (const linked of sorted) {
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
