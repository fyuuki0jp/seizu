/**
 * Markdown template for requirements traceability.
 *
 * Each requirement row maps a Requirement ID to the `@accepts` tags
 * declared on contracts, establishing forward traceability.
 */

export interface RequirementEntry {
  /** Unique requirement identifier (e.g. "REQ-001") */
  readonly id: string;
  /** Short description of the requirement */
  readonly description: string;
  /** Contract `@accepts` values that satisfy this requirement */
  readonly accepts: readonly string[];
}

function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

export function renderRequirementsMarkdown(
  entries: readonly RequirementEntry[],
  title = 'Requirements'
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push('| Requirement ID | Description | @accepts |');
  lines.push('|---|---|---|');

  for (const entry of entries) {
    const accepts =
      entry.accepts.length > 0
        ? entry.accepts.map(escapeMarkdownTableCell).join(', ')
        : '-';
    lines.push(
      `| ${escapeMarkdownTableCell(entry.id)} | ${escapeMarkdownTableCell(entry.description)} | ${accepts} |`
    );
  }

  lines.push('');
  return lines.join('\n');
}
