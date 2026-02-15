import type { FlowArtifact } from '../flow';
import type { Messages } from '../i18n/types';

export function renderFlowSection(
  flow: FlowArtifact,
  messages: Messages
): string {
  const f = messages.flow;
  const lines: string[] = [];

  lines.push(`<!-- flow-hash: ${flow.hash} -->`);
  lines.push('<details>');
  lines.push(`<summary>${f.detailsSummary}</summary>`);
  lines.push('');
  lines.push(flow.mermaid);
  lines.push('');
  lines.push('</details>');
  lines.push('');

  lines.push(`#### ${f.summaryTitle}`);
  lines.push('');
  lines.push(`| ${f.summaryMetric} | ${f.summaryValue} |`);
  lines.push('|---|---|');
  lines.push(`| ${f.stepCount} | ${flow.summary.stepCount} |`);
  lines.push(`| ${f.branchCount} | ${flow.summary.branchCount} |`);
  lines.push(`| ${f.errorPathCount} | ${flow.summary.errorPathCount} |`);
  lines.push(`| ${f.unsupportedCount} | ${flow.summary.unsupportedCount} |`);

  if (flow.summary.unsupportedCount > 0) {
    lines.push('');
    lines.push(f.unsupportedWarning(flow.summary.unsupportedCount));
  }

  lines.push('');
  return lines.join('\n');
}
