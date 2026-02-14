import { isOk } from 'kata';
import { renderMarkdownScenario } from '../../domain/render';
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
  const result = renderMarkdownScenario([], {
    title: model.title,
    description: model.description,
    flowEnabled: options.flowEnabled ?? true,
    contracts: model.contracts,
    scenarios: model.scenarios,
    messages: options.messages,
    coverageReport: options.coverageReport,
  });

  if (!isOk(result)) {
    // Keep fallback deterministic and visible when render contract preconditions fail.
    return `# ${model.title}\n\n`;
  }

  return result.value.join('\n').replace(/\n{3,}/g, '\n\n');
}
