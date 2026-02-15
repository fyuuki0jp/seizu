import { describe, expect, test } from 'vitest';
import { analyzeCoverage } from '../src/doc/analyzer/coverage-analyzer';
import type { LinkedContract } from '../src/doc/types';

describe('analyzeCoverage', () => {
  test('fully covered contract', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'cart.addItem',
          accepts: [],
          description: 'Add item',
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'CartNotFound | DuplicateItem',
          },
          guards: [
            {
              index: 0,
              description: 'Cart must exist',
              errorTags: ['CartNotFound'],
              kind: 'inline',
              referenceName: undefined,
            },
            {
              index: 1,
              description: 'Item unique',
              errorTags: ['DuplicateItem'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: 'addItem',
          sourceFile: 'cart.ts',
          line: 1,
        },
        testSuite: {
          contractId: 'cart.addItem',
          tests: [
            {
              name: 'adds item to existing cart',
              classification: 'success',
              sourceFile: 'cart.test.ts',
              line: 1,
            },
            {
              name: 'returns CartNotFound when cart missing',
              classification: 'failure',
              sourceFile: 'cart.test.ts',
              line: 5,
            },
            {
              name: 'returns DuplicateItem for existing item',
              classification: 'failure',
              sourceFile: 'cart.test.ts',
              line: 10,
            },
          ],
          sourceFile: 'cart.test.ts',
        },
      },
    ];

    const report = analyzeCoverage(linked);

    expect(report.contracts).toHaveLength(1);
    const contract = report.contracts[0];
    expect(contract.contractId).toBe('cart.addItem');
    expect(contract.hasTests).toBe(true);
    expect(contract.testCount).toBe(3);
    expect(contract.successTestCount).toBe(1);
    expect(contract.failureTestCount).toBe(2);
    expect(contract.totalErrorTags).toBe(2);
    expect(contract.coveredErrorTags).toBe(2);

    expect(report.summary.totalContracts).toBe(1);
    expect(report.summary.testedContracts).toBe(1);
    expect(report.summary.contractCoveragePercent).toBe(100);
    expect(report.summary.errorTagCoveragePercent).toBe(100);
  });

  test('untested contract', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'order.create',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'Must be valid',
              errorTags: ['InvalidInput'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'order.ts',
          line: 1,
        },
        testSuite: undefined,
      },
    ];

    const report = analyzeCoverage(linked);

    expect(report.contracts[0].hasTests).toBe(false);
    expect(report.contracts[0].testCount).toBe(0);
    expect(report.contracts[0].coveredErrorTags).toBe(0);
    expect(report.contracts[0].totalErrorTags).toBe(1);

    expect(report.summary.untestedContracts).toBe(1);
    expect(report.summary.contractCoveragePercent).toBe(0);
    expect(report.summary.errorTagCoveragePercent).toBe(0);
  });

  test('partial error tag coverage', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'cart.addItem',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'Guard 1',
              errorTags: ['CartNotFound'],
              kind: 'inline',
              referenceName: undefined,
            },
            {
              index: 1,
              description: 'Guard 2',
              errorTags: ['DuplicateItem'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'cart.ts',
          line: 1,
        },
        testSuite: {
          contractId: 'cart.addItem',
          tests: [
            {
              name: 'handles CartNotFound error',
              classification: 'failure',
              sourceFile: 'cart.test.ts',
              line: 1,
            },
          ],
          sourceFile: 'cart.test.ts',
        },
      },
    ];

    const report = analyzeCoverage(linked);
    const contract = report.contracts[0];

    expect(contract.coveredErrorTags).toBe(1);
    expect(contract.totalErrorTags).toBe(2);
    expect(contract.errorTags[0].hasFailureTest).toBe(true);
    expect(contract.errorTags[0].matchingTestName).toBe(
      'handles CartNotFound error'
    );
    expect(contract.errorTags[1].hasFailureTest).toBe(false);
    expect(contract.errorTags[1].matchingTestName).toBeUndefined();

    expect(report.summary.errorTagCoveragePercent).toBe(50);
  });

  test('empty contracts returns 100% coverage', () => {
    const report = analyzeCoverage([]);

    expect(report.summary.totalContracts).toBe(0);
    expect(report.summary.contractCoveragePercent).toBe(100);
    expect(report.summary.errorTagCoveragePercent).toBe(100);
  });

  test('contract with no guards has zero error tags', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'simple.op',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'never',
          },
          guards: [],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'simple.ts',
          line: 1,
        },
        testSuite: {
          contractId: 'simple.op',
          tests: [
            {
              name: 'works',
              classification: 'success',
              sourceFile: 'simple.test.ts',
              line: 1,
            },
          ],
          sourceFile: 'simple.test.ts',
        },
      },
    ];

    const report = analyzeCoverage(linked);
    const contract = report.contracts[0];

    expect(contract.hasTests).toBe(true);
    expect(contract.totalErrorTags).toBe(0);
    expect(contract.coveredErrorTags).toBe(0);
    expect(report.summary.errorTagCoveragePercent).toBe(100);
  });

  test('case-insensitive error tag matching', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'test.op',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'check',
              errorTags: ['NotFound'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'test.ts',
          line: 1,
        },
        testSuite: {
          contractId: 'test.op',
          tests: [
            {
              name: 'returns notfound when missing',
              classification: 'failure',
              sourceFile: 'test.test.ts',
              line: 1,
            },
          ],
          sourceFile: 'test.test.ts',
        },
      },
    ];

    const report = analyzeCoverage(linked);
    expect(report.contracts[0].errorTags[0].hasFailureTest).toBe(true);
  });

  test('keeps one decimal precision for repeating ratios', () => {
    const linked: LinkedContract[] = [
      {
        contract: {
          id: 'a',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'g1',
              errorTags: ['E1'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'a.ts',
          line: 1,
        },
        testSuite: {
          contractId: 'a',
          tests: [
            {
              name: 'returns E1',
              classification: 'failure',
              sourceFile: 'a.test.ts',
              line: 1,
            },
          ],
          sourceFile: 'a.test.ts',
        },
      },
      {
        contract: {
          id: 'b',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'g2',
              errorTags: ['E2'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'b.ts',
          line: 1,
        },
        testSuite: undefined,
      },
      {
        contract: {
          id: 'c',
          accepts: [],
          description: undefined,
          typeInfo: {
            stateTypeName: 'S',
            inputTypeName: 'I',
            errorTypeName: 'E',
          },
          guards: [
            {
              index: 0,
              description: 'g3',
              errorTags: ['E3'],
              kind: 'inline',
              referenceName: undefined,
            },
          ],
          conditions: [],
          invariants: [],
          variableName: undefined,
          sourceFile: 'c.ts',
          line: 1,
        },
        testSuite: undefined,
      },
    ];

    const report = analyzeCoverage(linked);
    expect(report.summary.contractCoveragePercent).toBe(33.3);
    expect(report.summary.errorTagCoveragePercent).toBe(33.3);
  });
});
