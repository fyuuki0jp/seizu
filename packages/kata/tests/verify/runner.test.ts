import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import type { Contract, Result } from '../../src/index';
import { check, define, ensure, err, guard, ok, pass } from '../../src/index';
import { verifyContract } from '../../src/verify/runner';

type State = { value: number };
type Input = { amount: number };
type Err = { tag: string };

const stateArb = fc.record({ value: fc.integer({ min: -100, max: 100 }) });
const inputArb = fc.record({ amount: fc.integer({ min: -100, max: 100 }) });

describe('pre_not_guarded detection', () => {
  test('detects when pre is false but contract returns ok', () => {
    const brokenExecute = (_state: State, input: Input): Result<State, Err> =>
      ok({ value: input.amount });

    const brokenContract = Object.assign(brokenExecute, {
      pre: [
        guard(
          'positive',
          (_s: State, i: Input): Result<void, Err> =>
            i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (state: State, input: Input) => ({
        value: state.value + input.amount,
      }),
    }) as Contract<State, Input, Err>;
    Object.defineProperty(brokenContract, 'name', {
      value: 'broken.noGuard',
      configurable: true,
    });

    const result = verifyContract(
      { contract: brokenContract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    const preCheck = result.checks.find((c) => c.id === 'positive');
    expect(preCheck).toBeDefined();
    expect(preCheck?.status).toBe('failed');
    expect(preCheck?.violation).toBe('pre_not_guarded');
    expect(preCheck?.counterexample).toBeDefined();
  });
});

describe('postcondition_failed detection', () => {
  test('detects when postcondition is violated', () => {
    const contract = define<State, Input, Err>('test.postFail', {
      pre: [guard('always pass', () => pass)],
      transition: (state, input) => ({
        value: state.value + input.amount,
      }),
      post: [check('always negative', (_before, after) => after.value < 0)],
    });

    const result = verifyContract(
      { contract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    const postCheck = result.checks.find((c) => c.id === 'always negative');
    expect(postCheck).toBeDefined();
    expect(postCheck?.status).toBe('failed');
    expect(postCheck?.violation).toBe('postcondition_failed');
  });
});

describe('invariant_failed detection', () => {
  test('detects when invariant is violated after transition', () => {
    const contract = define<State, Input, Err>('test.invFail', {
      pre: [guard('always pass', () => pass)],
      transition: (state, input) => ({
        value: state.value + input.amount,
      }),
      invariant: [ensure('non-negative', (state) => state.value >= 0)],
    });

    const result = verifyContract(
      { contract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    const invCheck = result.checks.find((c) => c.id === 'non-negative');
    expect(invCheck).toBeDefined();
    expect(invCheck?.status).toBe('failed');
    expect(invCheck?.violation).toBe('invariant_failed');
  });
});

describe('unexpected_error detection', () => {
  test('detects when all pre pass but contract returns err', () => {
    const brokenExecute = (): Result<State, Err> => err({ tag: 'Hidden' });

    const brokenContract = Object.assign(brokenExecute, {
      pre: [guard('always pass', (): Result<void, Err> => pass)],
      transition: (state: State) => state,
    }) as Contract<State, Input, Err>;
    Object.defineProperty(brokenContract, 'name', {
      value: 'broken.hiddenGuard',
      configurable: true,
    });

    const result = verifyContract(
      { contract: brokenContract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    const consistencyCheck = result.checks.find(
      (c) => c.kind === 'consistency'
    );
    expect(consistencyCheck).toBeDefined();
    expect(consistencyCheck?.status).toBe('failed');
    expect(consistencyCheck?.violation).toBe('unexpected_error');
  });
});

describe('all checks pass', () => {
  test('produces no violations for a correct contract', () => {
    const contract = define<State, Input, Err>('test.correct', {
      pre: [
        guard('positive', (_s, i) =>
          i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (state, input) => ({
        value: state.value + input.amount,
      }),
      post: [
        check('value increases', (before, after) => after.value > before.value),
      ],
      invariant: [ensure('always true', () => true)],
    });

    const result = verifyContract(
      { contract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    expect(result.contractName).toBe('test.correct');
    expect(result.checks.every((c) => c.status === 'passed')).toBe(true);
  });

  test('uses guard label as check id', () => {
    const contract = define<State, Input, Err>('test.named', {
      pre: [
        guard('positiveInput', (_s: State, i: Input) =>
          i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (state, input) => ({
        value: state.value + input.amount,
      }),
    });

    const result = verifyContract(
      { contract, state: stateArb, input: inputArb },
      { numRuns: 50 }
    );

    const preCheck = result.checks.find((c) => c.kind === 'pre');
    expect(preCheck?.id).toBe('positiveInput');
  });
});
