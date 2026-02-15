import type { FlowGraph, FlowNode } from './types';

export function renderMermaid(graph: FlowGraph): string {
  const lines: string[] = ['```mermaid', 'flowchart TD'];

  for (const node of graph.nodes) {
    lines.push(`  ${node.id}${shapeNode(node)}`);
  }

  for (const edge of graph.edges) {
    const label = edge.label ? `|${escapeLabel(edge.label)}|` : '';
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  }

  lines.push('```');
  return lines.join('\n');
}

function shapeNode(node: FlowNode): string {
  const label = `"${escapeLabel(node.label)}"`;

  switch (node.kind) {
    case 'start':
    case 'end':
      return `([${label}])`;
    case 'decision':
    case 'loop':
    case 'precondition':
      return `{${label}}`;
    case 'error':
      return `([${label}])`;
    case 'unsupported':
      return `[[${label}]]`;
    default:
      return `[${label}]`;
  }
}

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '<br/>')
    .trim();
}
