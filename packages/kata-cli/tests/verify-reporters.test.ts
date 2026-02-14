import type { CheckResult, ContractResult, VerifyResult } from 'kata/verify';
import { describe, expect, test } from 'vitest';
import { json } from '../src/verify/reporters/json';
import { replay } from '../src/verify/reporters/replay';
import { summary } from '../src/verify/reporters/summary';

function makeCheck(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: 'cart.exists',
    kind: 'pre',
    status: 'passed',
    runs: 100,
    ...overrides,
  };
}

function makeContractResult(
  overrides: Partial<ContractResult> = {}
): ContractResult {
  return {
    contractId: 'cart.addItem',
    checks: [makeCheck()],
    ...overrides,
  };
}

function makeVerifyResult(overrides: Partial<VerifyResult> = {}): VerifyResult {
  return {
    success: true,
    results: [makeContractResult()],
    summary: { contracts: 1, checks: 1, passed: 1, failed: 0 },
    ...overrides,
  };
}

describe('json reporter', () => {
  test('serializes result as JSON', () => {
    const result = makeVerifyResult();
    const output = json(result);
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.results[0].contractId).toBe('cart.addItem');
  });
});

describe('summary reporter', () => {
  test('formats passing result', () => {
    const output = summary(makeVerifyResult());
    expect(output).toContain('kata-verify');
    expect(output).toContain('cart.addItem');
    expect(output).toContain('1 contracts');
    expect(output).toContain('1 passed');
    expect(output).toContain('0 failed');
  });

  test('formats grouped checks by kind', () => {
    const result = makeVerifyResult({
      results: [
        makeContractResult({
          checks: [
            makeCheck({ id: 'pre1', kind: 'pre' }),
            makeCheck({ id: 'post1', kind: 'post' }),
            makeCheck({ id: 'inv1', kind: 'invariant' }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 3, passed: 3, failed: 0 },
    });

    const output = summary(result);
    expect(output).toContain('pre');
    expect(output).toContain('post');
    expect(output).toContain('invariant');
  });

  test('formats failed check with counterexample', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'cart.exists',
              kind: 'pre',
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: {
                state: { exists: false },
                input: { itemId: 'apple' },
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('\u2717');
    expect(output).toContain('Counterexample');
    expect(output).toContain('state =');
    expect(output).toContain('input =');
    expect(output).toContain('Precondition');
  });

  test('shows (none) for empty postconditions when pre exists', () => {
    const result = makeVerifyResult({
      results: [
        makeContractResult({
          checks: [makeCheck({ kind: 'pre' })],
        }),
      ],
    });

    const output = summary(result);
    expect(output).toContain('(none)');
  });

  test('formats postcondition violation', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'count.up',
              kind: 'post',
              status: 'failed',
              violation: 'postcondition_failed',
              counterexample: {
                state: { items: [] },
                input: { itemId: 'x' },
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('postcondition');
  });

  test('formats invariant violation', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'qty.positive',
              kind: 'invariant',
              status: 'failed',
              violation: 'invariant_failed',
              counterexample: {
                state: { items: [] },
                input: { qty: -1 },
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('invariant');
  });

  test('formats unexpected error violation', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'consistency',
              kind: 'consistency',
              status: 'failed',
              violation: 'unexpected_error',
              counterexample: {
                state: {},
                input: {},
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('unexpected error');
  });

  test('formats failed check without counterexample', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'some.check',
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: undefined,
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('\u2717');
    expect(output).not.toContain('Counterexample');
  });

  test('formats consistency check that passes (not shown)', () => {
    const result = makeVerifyResult({
      results: [
        makeContractResult({
          checks: [
            makeCheck({ kind: 'pre' }),
            makeCheck({
              id: 'cart.consistency',
              kind: 'consistency',
              status: 'passed',
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 2, passed: 2, failed: 0 },
    });

    const output = summary(result);
    expect(output).toContain('pre');
    expect(output).not.toContain('consistency');
  });

  test('formats default violation description', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: undefined,
              counterexample: { state: {}, input: {} },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('\u2717');
  });

  test('formats Map values in counterexample', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: {
                state: new Map([['a', 1]]),
                input: {},
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = summary(result);
    expect(output).toContain('Map(1)');
  });
});

describe('replay reporter', () => {
  test('returns success message when all pass', () => {
    const output = replay(makeVerifyResult());
    expect(output).toContain('All checks passed');
  });

  test('formats failed check as replay guide', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              id: 'cart.exists',
              status: 'failed',
              violation: 'pre_not_guarded',
              seed: 12345,
              path: '0:1:2',
              counterexample: {
                state: { exists: false },
                input: { itemId: 'apple' },
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('PRE NOT GUARDED');
    expect(output).toContain('cart.addItem > cart.exists');
    expect(output).toContain('const state =');
    expect(output).toContain('const input =');
    expect(output).toContain('npx kata verify --seed 12345');
    expect(output).toContain('--path "0:1:2"');
  });

  test('formats postcondition violation label', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'postcondition_failed',
              counterexample: { state: {}, input: {} },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('POSTCONDITION VIOLATION');
  });

  test('formats invariant violation label', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'invariant_failed',
              counterexample: { state: {}, input: {} },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('INVARIANT VIOLATION');
  });

  test('formats unexpected error label', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'unexpected_error',
              counterexample: { state: {}, input: {} },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('UNEXPECTED ERROR');
  });

  test('formats Map values in replay', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: {
                state: new Map(),
                input: {},
              },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('new Map()');
  });

  test('formats failure without counterexample', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: undefined,
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('PRE NOT GUARDED');
    expect(output).not.toContain('const state =');
  });

  test('formats failure without seed/path', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: { state: {}, input: {} },
              seed: undefined,
              path: undefined,
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).not.toContain('Reproduce:');
  });

  test('formats unknown violation type', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: undefined,
              counterexample: { state: {}, input: {} },
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = replay(result);
    expect(output).toContain('VIOLATION');
  });
});
