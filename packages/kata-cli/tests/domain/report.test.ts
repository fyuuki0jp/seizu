import { expectErr, expectOk } from 'kata/testing';
import type { CheckResult, ContractResult, VerifyResult } from 'kata/verify';
import { describe, expect, test } from 'vitest';
import { reportReplay, reportSummary } from '../../src/domain/index';

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
    contractName: 'cart.addItem',
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

// === report.summary ===

describe('report.summary', () => {
  test('formats passing result', () => {
    const result = makeVerifyResult();
    const output = expectOk(reportSummary('', { result }));
    expect(output).toContain('kata-verify');
    expect(output).toContain('cart.addItem');
  });

  test('formats result with multiple contracts', () => {
    const result = makeVerifyResult({
      results: [
        makeContractResult(),
        makeContractResult({ contractName: 'cart.removeItem' }),
      ],
      summary: { contracts: 2, checks: 2, passed: 2, failed: 0 },
    });
    const output = expectOk(reportSummary('', { result }));
    expect(output).toContain('cart.addItem');
    expect(output).toContain('cart.removeItem');
  });

  test('rejects empty results', () => {
    const result = makeVerifyResult({ results: [] });
    const error = expectErr(reportSummary('', { result }));
    expect(error.tag).toBe('NoResults');
  });

  test('post/invariant: hold after transition', () => {
    const before = '';
    const input = { result: makeVerifyResult() };
    const after = reportSummary.transition(before, input);
    for (const post of reportSummary.post ?? []) {
      expect(post.fn(before, after, input)).toBe(true);
    }
    for (const inv of reportSummary.invariant ?? []) {
      expect(inv.fn(after)).toBe(true);
    }
  });

  test('exposes contract metadata', () => {
    expect(reportSummary.name).toBe('report.summary');
    expect(reportSummary.pre.length).toBe(1);
  });
});

// === report.replay ===

describe('report.replay', () => {
  test('formats failed result', () => {
    const result = makeVerifyResult({
      success: false,
      results: [
        makeContractResult({
          checks: [
            makeCheck({
              status: 'failed',
              violation: 'pre_not_guarded',
              counterexample: {
                state: { exists: false },
                input: { itemId: 'apple' },
              },
              seed: 12345,
              path: '0:1:2',
            }),
          ],
        }),
      ],
      summary: { contracts: 1, checks: 1, passed: 0, failed: 1 },
    });

    const output = expectOk(reportReplay('', { result }));
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('cart.addItem');
  });

  test('rejects successful result', () => {
    const result = makeVerifyResult({ success: true });
    const error = expectErr(reportReplay('', { result }));
    expect(error.tag).toBe('NoFailures');
  });

  test('post/invariant: hold after transition', () => {
    const before = '';
    const input = {
      result: makeVerifyResult({
        success: false,
        results: [
          makeContractResult({
            checks: [
              makeCheck({
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
      }),
    };
    const after = reportReplay.transition(before, input);
    for (const post of reportReplay.post ?? []) {
      expect(post.fn(before, after, input)).toBe(true);
    }
    for (const inv of reportReplay.invariant ?? []) {
      expect(inv.fn(after)).toBe(true);
    }
  });

  test('exposes contract metadata', () => {
    expect(reportReplay.name).toBe('report.replay');
    expect(reportReplay.pre.length).toBe(1);
  });
});
