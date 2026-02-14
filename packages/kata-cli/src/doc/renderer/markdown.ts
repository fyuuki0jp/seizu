import { isOk } from 'kata';
import {
  renderContractSections,
  renderCoverageSection,
  renderMarkdownScenario,
} from '../../domain/render';
import type { CoverageReport } from '../analyzer/coverage-types';
import type { Messages } from '../i18n/types';
import type { DocumentModel } from '../types';

export interface RenderOptions {
  readonly messages: Messages;
  readonly coverageReport?: CoverageReport;
  readonly flowEnabled?: boolean;
}

/**
 * Render a DocumentModel into a complete Markdown string.
 * Rendering is delegated to the kata scenario-based renderer (`render.markdown`).
 */
export function renderMarkdown(
  model: DocumentModel,
  options: RenderOptions
): string {
  const flowEnabled = options.flowEnabled ?? true;
  const result = renderMarkdownScenario([], {
    title: model.title,
    description: model.description,
    flowEnabled,
    contracts: model.contracts,
    scenarios: model.scenarios,
    messages: options.messages,
    coverageReport: options.coverageReport,
  });

  if (!isOk(result)) {
    throw new Error(
      `render.markdown failed at step ${result.error.stepIndex}: ${result.error.contractId}`
    );
  }

  let lines = renderContractSections(result.value, {
    contracts: model.contracts,
    hasScenarios: model.scenarios.length > 0,
    messages: options.messages,
    flowEnabled,
  });

  if (options.coverageReport) {
    lines = renderCoverageSection(lines, {
      report: options.coverageReport,
      messages: options.messages,
    });
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}
