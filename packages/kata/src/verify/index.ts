export type { ContractEntry, RunnerOptions } from './runner';
export { verify, verifyContract } from './runner';
export type {
  CheckKind,
  CheckResult,
  ContractResult,
  VerifyResult,
  ViolationKind,
} from './types';

import type { Arbitrary } from 'fast-check';
import type { Contract } from '../types';
import type { RunnerOptions } from './runner';
import { verifyContract } from './runner';

export function assertContractValid<TState, TInput, TError>(
  contract: Contract<TState, TInput, TError>,
  arbitraries: {
    state: Arbitrary<TState>;
    input: Arbitrary<TInput>;
  },
  options?: RunnerOptions
): void {
  const result = verifyContract(
    {
      contract: contract as Contract<unknown, unknown, unknown>,
      state: arbitraries.state as Arbitrary<unknown>,
      input: arbitraries.input as Arbitrary<unknown>,
    },
    options
  );
  const failures = result.checks.filter((c) => c.status === 'failed');
  if (failures.length > 0) {
    const messages = failures.map((f) => {
      const violationLabel = f.violation ?? 'unknown violation';
      const details: string[] = [];
      if (f.seed !== undefined) {
        details.push(`seed: ${f.seed}`);
      }
      if (f.path !== undefined) {
        details.push(`path: ${f.path}`);
      }
      const detailsSuffix =
        details.length > 0 ? ` (${details.join(', ')})` : '';
      return `  [${violationLabel}] ${f.id}${detailsSuffix}`;
    });
    throw new Error(
      `Contract "${contract.name}" has ${failures.length} violation(s):\n${messages.join('\n')}`
    );
  }
}
