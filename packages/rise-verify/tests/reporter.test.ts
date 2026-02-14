import { describe, expect, test } from 'vitest';
import { json } from '../src/reporter/json';
import { replay } from '../src/reporter/replay';
import { summary } from '../src/reporter/summary';
import type { VerifyResult } from '../src/types';

const passingResult: VerifyResult = {
  success: true,
  results: [
    {
      contractId: 'cart.create',
      checks: [
        { id: 'pre[0]', kind: 'pre', status: 'passed', runs: 100 },
        {
          id: 'cart.create.consistency',
          kind: 'consistency',
          status: 'passed',
          runs: 100,
        },
      ],
    },
  ],
  summary: { contracts: 1, checks: 2, passed: 2, failed: 0 },
};

const failingResult: VerifyResult = {
  success: false,
  results: [
    {
      contractId: 'cart.addItem',
      checks: [
        { id: 'pre[0]', kind: 'pre', status: 'passed', runs: 100 },
        { id: 'pre[1]', kind: 'pre', status: 'passed', runs: 100 },
        { id: 'post[0]', kind: 'post', status: 'passed', runs: 100 },
        {
          id: 'invariant[0]',
          kind: 'invariant',
          status: 'failed',
          runs: 100,
          violation: 'invariant_failed',
          counterexample: {
            state: { exists: true, items: [] },
            input: { itemId: 'a', qty: 0, price: 5 },
          },
          seed: 1234567890,
          path: '0:1:3',
        },
        {
          id: 'cart.addItem.consistency',
          kind: 'consistency',
          status: 'passed',
          runs: 100,
        },
      ],
    },
  ],
  summary: { contracts: 1, checks: 5, passed: 4, failed: 1 },
};

describe('summary reporter', () => {
  test('formats passing results', () => {
    const output = summary(passingResult);
    expect(output).toContain('rise-verify');
    expect(output).toContain('cart.create');
    expect(output).toContain('\u2713');
    expect(output).toContain('pre[0]');
    expect(output).toContain('1 contracts, 2 checks, 2 passed, 0 failed');
  });

  test('formats failing results with counterexample', () => {
    const output = summary(failingResult);
    expect(output).toContain('\u2717');
    expect(output).toContain('invariant[0]');
    expect(output).toContain('Counterexample:');
    expect(output).toContain('1 contracts, 5 checks, 4 passed, 1 failed');
  });
});

describe('json reporter', () => {
  test('produces valid JSON', () => {
    const output = json(failingResult);
    const parsed = JSON.parse(output);
    expect(parsed).toBeDefined();
  });

  test('matches expected schema structure', () => {
    const output = json(failingResult);
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(false);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].contractId).toBe('cart.addItem');
    expect(parsed.results[0].checks).toHaveLength(5);
    expect(parsed.summary.contracts).toBe(1);
    expect(parsed.summary.checks).toBe(5);
    expect(parsed.summary.passed).toBe(4);
    expect(parsed.summary.failed).toBe(1);
  });

  test('includes violation details in failed checks', () => {
    const output = json(failingResult);
    const parsed = JSON.parse(output);
    const failed = parsed.results[0].checks.find(
      (c: { status: string }) => c.status === 'failed'
    );
    expect(failed.violation).toBe('invariant_failed');
    expect(failed.counterexample).toBeDefined();
    expect(failed.seed).toBe(1234567890);
    expect(failed.path).toBe('0:1:3');
  });
});

describe('replay reporter', () => {
  test('outputs "no failures" for passing result', () => {
    const output = replay(passingResult);
    expect(output).toContain('All checks passed');
  });

  test('includes reproduction code for failures', () => {
    const output = replay(failingResult);
    expect(output).toContain('INVARIANT VIOLATION');
    expect(output).toContain('cart.addItem');
    expect(output).toContain('invariant[0]');
    expect(output).toContain('const state =');
    expect(output).toContain('const input =');
    expect(output).toContain('Reproduce: npx rise-verify --seed 1234567890');
  });
});
