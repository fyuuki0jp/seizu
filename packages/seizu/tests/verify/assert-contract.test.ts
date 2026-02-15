import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import type { Contract, Result } from '../../src/index';
import { check, define, ensure, err, guard, ok, pass } from '../../src/index';
import { assertContractValid } from '../../src/verify/index';

type State = { value: number };
type Input = { amount: number };
type Err = { tag: string };

const stateArb = fc.record({ value: fc.integer({ min: 0, max: 100 }) });
const inputArb = fc.record({ amount: fc.integer({ min: 1, max: 50 }) });

describe('assertContractValid', () => {
  test('passes for a correct contract', () => {
    const contract = define<State, Input, Err>('test.correct', {
      pre: [
        guard('positive', (_s, i) =>
          i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (s, i) => ({ value: s.value + i.amount }),
      post: [
        check('value increases', (before, after) => after.value > before.value),
      ],
      invariant: [ensure('always true', () => true)],
    });

    expect(() =>
      assertContractValid(
        contract,
        { state: stateArb, input: inputArb },
        { numRuns: 50 }
      )
    ).not.toThrow();
  });

  test('throws for a contract with invariant violation', () => {
    const contract = define<State, Input, Err>('test.broken', {
      pre: [guard('always pass', () => pass)],
      transition: (s, i) => ({ value: s.value + i.amount }),
      invariant: [ensure('under 100', (s) => s.value <= 100)],
    });

    const wideStateArb = fc.record({
      value: fc.integer({ min: 0, max: 200 }),
    });
    const wideInputArb = fc.record({
      amount: fc.integer({ min: 1, max: 200 }),
    });

    expect(() =>
      assertContractValid(
        contract,
        { state: wideStateArb, input: wideInputArb },
        { numRuns: 200 }
      )
    ).toThrow('violation');
  });

  test('throws for a contract with pre_not_guarded', () => {
    const brokenExecute = (_s: State, i: Input): Result<State, Err> =>
      ok({ value: i.amount });

    const brokenContract = Object.assign(brokenExecute, {
      pre: [
        guard(
          'positive',
          (_s: State, i: Input): Result<void, Err> =>
            i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (s: State, i: Input) => ({ value: s.value + i.amount }),
    }) as Contract<State, Input, Err>;
    Object.defineProperty(brokenContract, 'name', {
      value: 'broken.noGuard',
      configurable: true,
    });

    const anyInputArb = fc.record({
      amount: fc.integer({ min: -100, max: 100 }),
    });

    expect(() =>
      assertContractValid(
        brokenContract,
        { state: stateArb, input: anyInputArb },
        { numRuns: 50 }
      )
    ).toThrow('violation');
  });

  test('error message includes contract name and violation details', () => {
    const brokenExecute = (): Result<State, Err> => err({ tag: 'Hidden' });

    const brokenContract = Object.assign(brokenExecute, {
      pre: [guard('always pass', (): Result<void, Err> => pass)],
      transition: (s: State) => s,
    }) as Contract<State, Input, Err>;
    Object.defineProperty(brokenContract, 'name', {
      value: 'broken.hidden',
      configurable: true,
    });

    try {
      assertContractValid(
        brokenContract,
        { state: stateArb, input: inputArb },
        { numRuns: 50 }
      );
      expect.fail('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('broken.hidden');
      expect(msg).toContain('unexpected_error');
    }
  });
});
