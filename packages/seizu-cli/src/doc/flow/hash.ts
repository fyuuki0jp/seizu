import { createHash } from 'node:crypto';
import type { FlowGraph, FlowOwnerKind } from './types';

export function hashFlow(
  ownerKind: FlowOwnerKind,
  ownerName: string,
  graph: FlowGraph
): string {
  const canonical = canonicalizeFlow(ownerKind, ownerName, graph);
  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

function canonicalizeFlow(
  ownerKind: FlowOwnerKind,
  ownerName: string,
  graph: FlowGraph
): string {
  const lines: string[] = [];
  lines.push(`owner:${ownerKind}:${ownerName}`);

  for (const node of graph.nodes) {
    lines.push(`node:${node.id}|${node.kind}|${normalizeText(node.label)}`);
  }

  for (const edge of graph.edges) {
    lines.push(
      `edge:${edge.from}->${edge.to}|${normalizeText(edge.label ?? '')}`
    );
  }

  return lines.join('\n');
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
