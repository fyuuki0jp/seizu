import { hashFlow } from './hash';
import { renderMermaid } from './mermaid';
import { summarizeFlow } from './summary';
import type {
  FlowArtifact,
  FlowEdge,
  FlowGraph,
  FlowNode,
  FlowNodeKind,
  FlowOwnerKind,
} from './types';

export interface EntryPoint {
  readonly nodeId: string;
  readonly edgeLabel?: string;
}

export class FlowGraphBuilder {
  private readonly nodes: FlowNode[] = [];
  private readonly edges: FlowEdge[] = [];
  private counter = 0;

  addNode(kind: FlowNodeKind, label: string): string {
    const id = `n${++this.counter}`;
    this.nodes.push({ id, kind, label, order: this.counter });
    return id;
  }

  addEdge(from: string, to: string, label?: string): void {
    this.edges.push({ from, to, label });
  }

  connectEntries(entries: readonly EntryPoint[], to: string): void {
    for (const entry of entries) {
      this.addEdge(entry.nodeId, to, entry.edgeLabel);
    }
  }

  build(): FlowGraph {
    const nodes = [...this.nodes].sort((a, b) => a.order - b.order);
    const orderMap = new Map<string, number>();
    for (const node of nodes) {
      orderMap.set(node.id, node.order);
    }
    const edges = [...this.edges].sort((a, b) => {
      const fromCmp =
        (orderMap.get(a.from) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(b.from) ?? Number.MAX_SAFE_INTEGER);
      if (fromCmp !== 0) return fromCmp;
      const toCmp =
        (orderMap.get(a.to) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(b.to) ?? Number.MAX_SAFE_INTEGER);
      if (toCmp !== 0) return toCmp;
      return (a.label ?? '').localeCompare(b.label ?? '');
    });

    return { nodes, edges };
  }
}

export function buildFlowArtifact(
  ownerKind: FlowOwnerKind,
  ownerName: string,
  graph: FlowGraph
): FlowArtifact {
  const summary = summarizeFlow(graph);
  const hash = hashFlow(ownerKind, ownerName, graph);
  const mermaid = renderMermaid(graph);
  return {
    ownerKind,
    ownerName,
    graph,
    mermaid,
    hash,
    summary,
  };
}
