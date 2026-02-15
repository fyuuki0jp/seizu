/**
 * Requirements template generation.
 *
 * Provides a minimal API for producing a requirements traceability
 * document that maps Requirement IDs to `@accepts` contract tags.
 */

import {
  type RequirementEntry,
  renderRequirementsMarkdown,
} from './templates/requirements.md';

export type { RequirementEntry };
export { renderRequirementsMarkdown };

export interface RequirementsOptions {
  /** Override the document title (default: "Requirements") */
  readonly title?: string;
}

/**
 * Generate requirements markdown content from entries.
 *
 * This is the main entry point for `--with-requirements`.
 * File I/O is intentionally excluded — the caller (core integration)
 * is responsible for writing the returned string.
 */
export function generateRequirements(
  entries: readonly RequirementEntry[],
  options?: RequirementsOptions
): string {
  return renderRequirementsMarkdown(entries, options?.title ?? 'Requirements');
}
