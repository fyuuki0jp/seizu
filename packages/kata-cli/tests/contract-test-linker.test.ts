import { describe, expect, test } from 'vitest';
import { linkContractsToTests } from '../src/doc/linker/contract-test-linker';
import type { ParsedContract, ParsedTestSuite } from '../src/doc/types';

const makeContract = (name: string): ParsedContract => ({
  name,
  accepts: [],
  description: undefined,
  typeInfo: {
    stateTypeName: 'S',
    inputTypeName: 'I',
    errorTypeName: 'E',
  },
  guards: [],
  conditions: [],
  invariants: [],
  variableName: undefined,
  sourceFile: 'test.ts',
  line: 1,
});

const makeTestSuite = (contractName: string): ParsedTestSuite => ({
  contractName,
  tests: [
    {
      name: 'test case 1',
      classification: 'success',
      sourceFile: 'test.test.ts',
      line: 1,
    },
  ],
  sourceFile: 'test.test.ts',
});

describe('linkContractsToTests', () => {
  test('links contract to matching test suite', () => {
    const contracts = [makeContract('cart.addItem')];
    const suites = [makeTestSuite('cart.addItem')];

    const linked = linkContractsToTests(contracts, suites);
    expect(linked).toHaveLength(1);
    expect(linked[0].contract.name).toBe('cart.addItem');
    expect(linked[0].testSuite).toBeDefined();
    expect(linked[0].testSuite?.tests).toHaveLength(1);
  });

  test('contract without matching test suite has undefined testSuite', () => {
    const contracts = [makeContract('cart.create')];
    const suites: ParsedTestSuite[] = [];

    const linked = linkContractsToTests(contracts, suites);
    expect(linked[0].testSuite).toBeUndefined();
  });

  test('orphaned test suites are ignored', () => {
    const contracts: ParsedContract[] = [];
    const suites = [makeTestSuite('cart.create')];

    const linked = linkContractsToTests(contracts, suites);
    expect(linked).toHaveLength(0);
  });

  test('merges test suites from multiple files for same contract', () => {
    const contracts = [makeContract('cart.addItem')];
    const suites: ParsedTestSuite[] = [
      {
        contractName: 'cart.addItem',
        tests: [
          {
            name: 'from file 1',
            classification: 'success',
            sourceFile: 'a.test.ts',
            line: 1,
          },
        ],
        sourceFile: 'a.test.ts',
      },
      {
        contractName: 'cart.addItem',
        tests: [
          {
            name: 'from file 2',
            classification: 'failure',
            sourceFile: 'b.test.ts',
            line: 1,
          },
        ],
        sourceFile: 'b.test.ts',
      },
    ];

    const linked = linkContractsToTests(contracts, suites);
    expect(linked[0].testSuite?.tests).toHaveLength(2);
  });
});
