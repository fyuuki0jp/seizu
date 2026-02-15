import { describe, expect, test } from 'vitest';
import { linkScenarios } from '../src/doc/linker/scenario-linker';
import type { ParsedContract, ParsedScenario } from '../src/doc/types';

function makeContract(name: string, variableName?: string): ParsedContract {
  return {
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
    variableName,
    sourceFile: 'test.ts',
    line: 1,
  };
}

function makeScenario(
  name: string,
  steps: ParsedScenario['steps']
): ParsedScenario {
  return {
    name,
    accepts: [],
    description: undefined,
    variableName: undefined,
    steps,
    sourceFile: 'test.ts',
    line: 1,
  };
}

describe('linkScenarios', () => {
  test('resolves steps to contracts by contract id', () => {
    const contracts = [
      makeContract('cart.create'),
      makeContract('cart.addItem'),
    ];
    const scenarios = [
      makeScenario('flow.purchase', [
        { index: 0, contractName: 'cart.create', inputLiteral: '{}' },
        { index: 1, contractName: 'cart.addItem', inputLiteral: '{}' },
      ]),
    ];

    const linked = linkScenarios(scenarios, contracts);
    expect(linked).toHaveLength(1);
    expect(linked[0].resolvedSteps[0].contract?.name).toBe('cart.create');
    expect(linked[0].resolvedSteps[1].contract?.name).toBe('cart.addItem');
  });

  test('resolves steps by variable name', () => {
    const contracts = [makeContract('cart.create', 'createCart')];
    const scenarios = [
      makeScenario('flow.test', [
        { index: 0, contractName: 'createCart', inputLiteral: '{}' },
      ]),
    ];

    const linked = linkScenarios(scenarios, contracts);
    expect(linked[0].resolvedSteps[0].contract?.name).toBe('cart.create');
  });

  test('returns undefined for unresolved contract', () => {
    const contracts = [makeContract('cart.create')];
    const scenarios = [
      makeScenario('flow.test', [
        { index: 0, contractName: 'unknown.op', inputLiteral: '{}' },
      ]),
    ];

    const linked = linkScenarios(scenarios, contracts);
    expect(linked[0].resolvedSteps[0].contract).toBeUndefined();
  });

  test('handles empty scenarios', () => {
    const linked = linkScenarios([], [makeContract('cart.create')]);
    expect(linked).toHaveLength(0);
  });

  test('handles scenario with empty steps', () => {
    const linked = linkScenarios(
      [makeScenario('flow.empty', [])],
      [makeContract('cart.create')]
    );
    expect(linked).toHaveLength(1);
    expect(linked[0].resolvedSteps).toHaveLength(0);
  });

  test('contract id takes precedence over variable name', () => {
    const contracts = [
      makeContract('actual.id', 'myVar'),
      makeContract('actual.id2', undefined),
    ];
    const scenarios = [
      makeScenario('test', [
        { index: 0, contractName: 'actual.id', inputLiteral: '{}' },
      ]),
    ];

    const linked = linkScenarios(scenarios, contracts);
    expect(linked[0].resolvedSteps[0].contract?.name).toBe('actual.id');
  });
});
