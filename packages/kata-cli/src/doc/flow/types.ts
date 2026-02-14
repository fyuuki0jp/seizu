export type FlowOwnerKind = 'contract' | 'scenario';

export type FlowNodeKind =
  | 'start'
  | 'end'
  | 'action'
  | 'decision'
  | 'loop'
  | 'error'
  | 'unsupported'
  | 'precondition'
  | 'postcondition'
  | 'invariant';

export interface FlowNode {
  readonly id: string;
  readonly kind: FlowNodeKind;
  readonly label: string;
  readonly order: number;
}

export interface FlowEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string | undefined;
}

export interface FlowGraph {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

export interface FlowSummary {
  readonly stepCount: number;
  readonly branchCount: number;
  readonly errorPathCount: number;
  readonly unsupportedCount: number;
}

export interface FlowArtifact {
  readonly ownerKind: FlowOwnerKind;
  readonly ownerId: string;
  readonly graph: FlowGraph;
  readonly mermaid: string;
  readonly hash: string;
  readonly summary: FlowSummary;
}
