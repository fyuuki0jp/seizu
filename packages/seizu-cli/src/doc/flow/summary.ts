import type { FlowGraph, FlowSummary } from './types';

export function summarizeFlow(graph: FlowGraph): FlowSummary {
  const stepCount = graph.nodes.filter((node) => isStepNode(node.kind)).length;
  const branchCount = graph.nodes.filter((node) =>
    isBranchNode(node.kind)
  ).length;
  const errorPathCount = graph.nodes.filter(
    (node) => node.kind === 'error'
  ).length;
  const unsupportedCount = graph.nodes.filter(
    (node) => node.kind === 'unsupported'
  ).length;

  return {
    stepCount,
    branchCount,
    errorPathCount,
    unsupportedCount,
  };
}

function isStepNode(kind: string): boolean {
  return (
    kind === 'action' ||
    kind === 'decision' ||
    kind === 'loop' ||
    kind === 'precondition' ||
    kind === 'postcondition' ||
    kind === 'invariant'
  );
}

function isBranchNode(kind: string): boolean {
  return kind === 'decision' || kind === 'loop';
}
