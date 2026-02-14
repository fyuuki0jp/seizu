export type ViolationKind =
  | 'pre_not_guarded'
  | 'postcondition_failed'
  | 'invariant_failed'
  | 'unexpected_error';

export type CheckKind = 'pre' | 'post' | 'invariant' | 'consistency';

export interface CheckResult {
  readonly id: string;
  readonly kind: CheckKind;
  readonly status: 'passed' | 'failed';
  readonly runs: number;
  readonly violation?: ViolationKind;
  readonly counterexample?: {
    readonly state: unknown;
    readonly input: unknown;
  };
  readonly seed?: number;
  readonly path?: string;
}

export interface ContractResult {
  readonly contractId: string;
  readonly checks: CheckResult[];
}

export interface VerifyResult {
  readonly success: boolean;
  readonly results: ContractResult[];
  readonly summary: {
    readonly contracts: number;
    readonly checks: number;
    readonly passed: number;
    readonly failed: number;
  };
}
