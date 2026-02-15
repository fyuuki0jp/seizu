import * as fc from 'fast-check';
import { isOk } from '../result';
import type { Contract } from '../types';
import type { CheckResult, ContractResult, VerifyResult } from './types';

export interface ContractEntry<
  TState = unknown,
  TInput = unknown,
  TError = unknown,
> {
  readonly contract: Contract<TState, TInput, TError>;
  readonly state: fc.Arbitrary<TState>;
  readonly input: fc.Arbitrary<TInput>;
}

export interface RunnerOptions {
  readonly numRuns?: number;
  readonly seed?: number;
  readonly path?: string;
}

function buildFcParams(
  numRuns: number,
  seed?: number,
  path?: string
): fc.Parameters<unknown[]> {
  const params: fc.Parameters<unknown[]> = { numRuns };
  if (seed !== undefined) {
    params.seed = seed;
  }
  if (path !== undefined) {
    params.path = path;
  }
  return params;
}

function extractFailure(
  id: string,
  kind: CheckResult['kind'],
  violation: CheckResult['violation'],
  details: fc.RunDetails<unknown[]>
): CheckResult {
  return {
    id,
    kind,
    status: 'failed',
    runs: details.numRuns,
    violation,
    counterexample: details.counterexample
      ? {
          state: details.counterexample[0],
          input: details.counterexample[1],
        }
      : undefined,
    seed: details.seed,
    path: details.counterexamplePath ?? undefined,
  };
}

function verifyPreGuard(
  entry: ContractEntry,
  guardIndex: number,
  numRuns: number,
  seed?: number,
  path?: string
): CheckResult {
  const { contract, state: stateArb, input: inputArb } = entry;
  const g = contract.pre[guardIndex];
  const guardId = g.label;

  const details = fc.check(
    fc.property(
      stateArb as fc.Arbitrary<unknown>,
      inputArb as fc.Arbitrary<unknown>,
      (state, input) => {
        const guardResult = g.fn(state, input);
        if (!guardResult.ok) {
          const contractResult = contract(state, input);
          return !isOk(contractResult);
        }
        return true;
      }
    ),
    buildFcParams(numRuns, seed, path)
  );

  if (details.failed) {
    return extractFailure(guardId, 'pre', 'pre_not_guarded', details);
  }

  return {
    id: guardId,
    kind: 'pre',
    status: 'passed',
    runs: details.numRuns,
  };
}

function verifyPostCondition(
  entry: ContractEntry,
  conditionIndex: number,
  numRuns: number,
  seed?: number,
  path?: string
): CheckResult {
  const { contract, state: stateArb, input: inputArb } = entry;
  const condition = contract.post?.[conditionIndex];
  if (!condition) {
    return { id: 'unknown', kind: 'post', status: 'passed', runs: 0 };
  }

  const condId = condition.label;

  const details = fc.check(
    fc.property(
      stateArb as fc.Arbitrary<unknown>,
      inputArb as fc.Arbitrary<unknown>,
      (state, input) => {
        const allPrePass = contract.pre.every((g) => isOk(g.fn(state, input)));
        if (!allPrePass) return true;

        const result = contract(state, input);
        if (!isOk(result)) return true;

        return condition.fn(state, result.value, input);
      }
    ),
    buildFcParams(numRuns, seed, path)
  );

  if (details.failed) {
    return extractFailure(condId, 'post', 'postcondition_failed', details);
  }

  return {
    id: condId,
    kind: 'post',
    status: 'passed',
    runs: details.numRuns,
  };
}

function verifyInvariant(
  entry: ContractEntry,
  invariantIndex: number,
  numRuns: number,
  seed?: number,
  path?: string
): CheckResult {
  const { contract, state: stateArb, input: inputArb } = entry;
  const inv = contract.invariant?.[invariantIndex];
  if (!inv) {
    return { id: 'unknown', kind: 'invariant', status: 'passed', runs: 0 };
  }

  const invId = inv.label;

  const details = fc.check(
    fc.property(
      stateArb as fc.Arbitrary<unknown>,
      inputArb as fc.Arbitrary<unknown>,
      (state, input) => {
        const allPrePass = contract.pre.every((g) => isOk(g.fn(state, input)));
        if (!allPrePass) return true;

        const result = contract(state, input);
        if (!isOk(result)) return true;

        return inv.fn(result.value);
      }
    ),
    buildFcParams(numRuns, seed, path)
  );

  if (details.failed) {
    return extractFailure(invId, 'invariant', 'invariant_failed', details);
  }

  return {
    id: invId,
    kind: 'invariant',
    status: 'passed',
    runs: details.numRuns,
  };
}

function verifyGuardConsistency(
  entry: ContractEntry,
  numRuns: number,
  seed?: number,
  path?: string
): CheckResult {
  const { contract, state: stateArb, input: inputArb } = entry;

  const details = fc.check(
    fc.property(
      stateArb as fc.Arbitrary<unknown>,
      inputArb as fc.Arbitrary<unknown>,
      (state, input) => {
        const allPrePass = contract.pre.every((g) => isOk(g.fn(state, input)));
        if (!allPrePass) return true;

        const result = contract(state, input);
        return isOk(result);
      }
    ),
    buildFcParams(numRuns, seed, path)
  );

  if (details.failed) {
    return extractFailure(
      `${contract.name}.consistency`,
      'consistency',
      'unexpected_error',
      details
    );
  }

  return {
    id: `${contract.name}.consistency`,
    kind: 'consistency',
    status: 'passed',
    runs: details.numRuns,
  };
}

export function verifyContract(
  entry: ContractEntry,
  options?: RunnerOptions
): ContractResult {
  const numRuns = options?.numRuns ?? 100;
  const checks: CheckResult[] = [];

  for (let i = 0; i < entry.contract.pre.length; i++) {
    checks.push(
      verifyPreGuard(entry, i, numRuns, options?.seed, options?.path)
    );
  }

  if (entry.contract.post) {
    for (let i = 0; i < entry.contract.post.length; i++) {
      checks.push(
        verifyPostCondition(entry, i, numRuns, options?.seed, options?.path)
      );
    }
  }

  if (entry.contract.invariant) {
    for (let i = 0; i < entry.contract.invariant.length; i++) {
      checks.push(
        verifyInvariant(entry, i, numRuns, options?.seed, options?.path)
      );
    }
  }

  checks.push(
    verifyGuardConsistency(entry, numRuns, options?.seed, options?.path)
  );

  return { contractName: entry.contract.name, checks };
}

export function verify(
  entries: ContractEntry[],
  options?: RunnerOptions
): VerifyResult {
  const results = entries.map((entry) => verifyContract(entry, options));
  const allChecks = results.flatMap((r) => r.checks);

  return {
    success: allChecks.every((c) => c.status === 'passed'),
    results,
    summary: {
      contracts: results.length,
      checks: allChecks.length,
      passed: allChecks.filter((c) => c.status === 'passed').length,
      failed: allChecks.filter((c) => c.status === 'failed').length,
    },
  };
}
