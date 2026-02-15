import { describe, expect, test } from 'vitest';
import type { ParsedContract } from '../src/doc/types';
import { validateContracts } from '../src/doc/validator';

function makeContract(overrides: Partial<ParsedContract> = {}): ParsedContract {
  return {
    id: 'test.contract',
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
    flow: undefined,
    variableName: undefined,
    sourceFile: 'test.ts',
    line: 1,
    ...overrides,
  };
}

describe('validateContracts', () => {
  test('reports error for contract without @accepts', () => {
    const contracts = [makeContract({ id: 'cart.create', accepts: [] })];
    const diagnostics = validateContracts(contracts);
    expect(diagnostics).toEqual([
      {
        level: 'error',
        contractId: 'cart.create',
        message: 'Missing @accepts tag in TSDoc comment',
      },
    ]);
  });

  test('returns no diagnostics for contract with @accepts', () => {
    const contracts = [
      makeContract({
        id: 'cart.create',
        accepts: ['Users can create a cart'],
      }),
    ];
    const diagnostics = validateContracts(contracts);
    expect(diagnostics).toEqual([]);
  });

  test('reports errors for multiple contracts without @accepts', () => {
    const contracts = [
      makeContract({ id: 'cart.create', accepts: [] }),
      makeContract({ id: 'cart.addItem', accepts: ['Add item'] }),
      makeContract({ id: 'cart.remove', accepts: [] }),
    ];
    const diagnostics = validateContracts(contracts);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].contractId).toBe('cart.create');
    expect(diagnostics[1].contractId).toBe('cart.remove');
  });

  test('returns empty array for empty input', () => {
    const diagnostics = validateContracts([]);
    expect(diagnostics).toEqual([]);
  });
});
