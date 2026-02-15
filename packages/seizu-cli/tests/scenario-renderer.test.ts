import { describe, expect, test } from 'vitest';
import { getMessages } from '../src/doc/i18n/index';
import { renderScenarioSection } from '../src/doc/renderer/scenario-section';
import type { LinkedScenario, ParsedScenario } from '../src/doc/types';

const en = getMessages('en');
const ja = getMessages('ja');

function makeLinkedScenario(scenario: ParsedScenario): LinkedScenario {
  return {
    scenario,
    resolvedSteps: scenario.steps.map((step) => ({
      step,
      contract: undefined,
    })),
  };
}

describe('renderScenarioSection', () => {
  const scenario = makeLinkedScenario({
    name: 'cart.normalPurchase',
    accepts: [],
    description: '通常の購入フロー',
    variableName: 'normalPurchase',
    steps: [
      {
        index: 0,
        contractName: 'cart.create',
        inputLiteral: "{ userId: 'alice' }",
      },
      {
        index: 1,
        contractName: 'cart.addItem',
        inputLiteral: "{ itemId: 'apple', qty: 3, price: 1.5 }",
      },
    ],
    sourceFile: 'cart-scenarios.ts',
    line: 10,
  });

  test('renders scenario section with English locale', () => {
    const result = renderScenarioSection([scenario], en);

    expect(result).toContain('## Scenarios');
    expect(result).toContain('### 通常の購入フロー');
    expect(result).toContain('`cart.normalPurchase`');
    expect(result).toContain('`cart.create`');
    expect(result).toContain('`cart.addItem`');
  });

  test('renders scenario section with Japanese locale', () => {
    const result = renderScenarioSection([scenario], ja);

    expect(result).toContain('## シナリオ');
    expect(result).toContain('### 通常の購入フロー');
    expect(result).toContain('操作');
  });

  test('renders 3-column table (step, operation, input)', () => {
    const result = renderScenarioSection([scenario], en);

    expect(result).toContain('| # | Operation | Input |');
    expect(result).toContain('|---|------|------|');
    expect(result).not.toContain('Expected');
  });

  test('renders empty scenarios message', () => {
    const result = renderScenarioSection([], en);
    expect(result).toContain('_No scenarios defined_');
  });

  test('renders empty input as dash', () => {
    const emptyInputScenario = makeLinkedScenario({
      name: 'test.emptyInput',
      accepts: [],
      description: undefined,
      variableName: undefined,
      steps: [{ index: 0, contractName: 'test.op', inputLiteral: '{}' }],
      sourceFile: 'test.ts',
      line: 1,
    });

    const result = renderScenarioSection([emptyInputScenario], en);
    expect(result).toContain('| - |');
  });

  test('strips type assertion from input', () => {
    const assertionScenario = makeLinkedScenario({
      name: 'test.assertion',
      accepts: [],
      description: undefined,
      variableName: undefined,
      steps: [
        {
          index: 0,
          contractName: 'test.op',
          inputLiteral: '{ filterIds: input.filterIds } as FilterInput',
        },
        {
          index: 1,
          contractName: 'test.op2',
          inputLiteral: '{} as Record<string, never>',
        },
      ],
      sourceFile: 'test.ts',
      line: 1,
    });

    const result = renderScenarioSection([assertionScenario], en);
    expect(result).not.toContain('as FilterInput');
    expect(result).not.toContain('as Record');
    expect(result).toContain('filterIds: input.filterIds');
    expect(result).toContain('| - |');
  });

  test('renders scenario without description using id as heading', () => {
    const noDescScenario = makeLinkedScenario({
      name: 'test.noDescription',
      accepts: [],
      description: undefined,
      variableName: undefined,
      steps: [],
      sourceFile: 'test.ts',
      line: 1,
    });

    const result = renderScenarioSection([noDescScenario], en);
    expect(result).toContain('### test.noDescription');
  });
});
