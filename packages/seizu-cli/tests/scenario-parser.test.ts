import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import {
  collectScenarioFlowViolations,
  parseScenarios,
} from '../src/doc/parser/scenario-parser';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

describe('parseScenarios', () => {
  test('parses a scenario with flow and steps', () => {
    const source = createSourceFile(`
import { define, guard, scenario, step } from 'seizu';

const createCart = define<S, I, E>('cart.create', {
  pre: [],
  transition: (s) => s,
});

const addItem = define<S, I, E>('cart.addItem', {
  pre: [],
  transition: (s) => s,
});

/** 通常の購入フロー */
const normalPurchase = scenario('cart.normalPurchase', {
  flow: (input) => [
    step(createCart, { userId: 'alice' }),
    step(addItem, { itemId: 'apple', qty: 3, price: 1.5 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);

    const s = scenarios[0];
    expect(s.name).toBe('cart.normalPurchase');
    expect(s.variableName).toBe('normalPurchase');
    expect(s.description).toBe('通常の購入フロー');
    expect(s.steps).toHaveLength(2);

    // Step 1: createCart resolved to cart.create via varMap
    expect(s.steps[0].contractName).toBe('cart.create');
    expect(s.steps[0].inputLiteral).toContain('userId');

    // Step 2: addItem resolved to cart.addItem via varMap
    expect(s.steps[1].contractName).toBe('cart.addItem');
    expect(s.steps[1].inputLiteral).toContain('apple');
  });

  test('parses flow with block body (return statement)', () => {
    const source = createSourceFile(`
const s = scenario('test.block', {
  flow: (input) => {
    return [
      step(create, { data: 1 }),
    ];
  },
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(1);
    expect(scenarios[0].steps[0].contractName).toBe('create');
  });

  test('parses multiple scenarios', () => {
    const source = createSourceFile(`
const a = scenario('flow.a', {
  flow: () => [],
});

const b = scenario('flow.b', {
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].name).toBe('flow.a');
    expect(scenarios[1].name).toBe('flow.b');
  });

  test('resolves contract variable to name via define() in same file', () => {
    const source = createSourceFile(`
const myContract = define<S, I, E>('domain.action', {
  pre: [],
  transition: (s) => s,
});

const s = scenario('test.resolve', {
  flow: () => [
    step(myContract, { data: 1 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractName).toBe('domain.action');
  });

  test('falls back to variable name when define() not found', () => {
    const source = createSourceFile(`
const s = scenario('test.fallback', {
  flow: () => [
    step(unknownContract, { data: 1 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractName).toBe('unknownContract');
  });

  test('returns empty for scenario() with no arguments', () => {
    const source = createSourceFile(`const s = scenario();`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('returns empty for scenario() with non-string first argument', () => {
    const source = createSourceFile(`const s = scenario({}, {});`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('returns empty for scenario() with only one argument', () => {
    const source = createSourceFile(`const s = scenario('test');`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('handles step with non-identifier contract arg', () => {
    const source = createSourceFile(`
const s = scenario('test.propaccess', {
  flow: () => [
    step(contracts.create, { data: 1 }),
  ],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractName).toBe('contracts.create');
  });

  test('reports violation when flow array contains identifier element', () => {
    const source = createSourceFile(`
const s = scenario('test.filter', {
  flow: () => [
    someVariable,
    step(create, { data: 1 }),
  ],
});
`);
    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.filter');

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('handles step with insufficient arguments', () => {
    const source = createSourceFile(`
const s = scenario('test.noargs', {
  flow: () => [
    step(create),
  ],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('handles scenario without enclosing variable', () => {
    const source = createSourceFile(`
export default scenario('test.novar', {
  flow: () => [],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].variableName).toBeUndefined();
    expect(scenarios[0].description).toBeUndefined();
  });

  test('reports violation when flow array contains helper call element', () => {
    const source = createSourceFile(`
const s = scenario('test.otherfn', {
  flow: () => [
    otherFunction(create, {}),
  ],
});
`);
    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.otherfn');

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('reports violation when flow array contains spread element', () => {
    const source = createSourceFile(`
const base = [step(create, { data: 1 })];
const s = scenario('test.spread', {
  flow: () => [
    ...base,
    step(update, { data: 2 }),
  ],
});
`);

    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.spread');
  });

  test('reports violation when flow array contains conditional element', () => {
    const source = createSourceFile(`
const s = scenario('test.conditional', {
  flow: (input) => [
    input.flag ? step(create, { data: 1 }) : step(update, { data: 2 }),
  ],
});
`);

    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.conditional');
  });

  test('returns empty steps when no flow property', () => {
    const source = createSourceFile(`
const s = scenario('test.noflow', {});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('returns empty steps when flow is not an arrow function', () => {
    const source = createSourceFile(`
const s = scenario('test.notarrow', {
  flow: someVariable,
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('rejects flow with imperative push pattern', () => {
    const source = createSourceFile(`
const create = define<S, I, E>('test.create', {
  pre: [],
  transition: (s) => s,
});

const update = define<S, I, E>('test.update', {
  pre: [],
  transition: (s) => s,
});

const s = scenario('test.push', {
  flow: (input) => {
    const steps = [];
    steps.push(step(create, { data: 1 }));
    steps.push(step(update, { data: 2 }));
    return steps;
  },
});
`);

    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.push');

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('rejects flow with conditional push pattern', () => {
    const source = createSourceFile(`
const create = define<S, I, E>('test.create', {
  pre: [],
  transition: (s) => s,
});

const update = define<S, I, E>('test.update', {
  pre: [],
  transition: (s) => s,
});

const s = scenario('test.condpush', {
  flow: (input) => {
    const steps = [];
    steps.push(step(create, { data: 1 }));
    if (input.flag) {
      steps.push(step(update, { data: 2 }));
    }
    return steps;
  },
});
`);

    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.condpush');

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('rejects flow with non-literal return', () => {
    const source = createSourceFile(`
const s = scenario('test.nonliteralreturn', {
  flow: () => {
    return buildSteps();
  },
});
`);

    const violations = collectScenarioFlowViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0].scenarioName).toBe('test.nonliteralreturn');
  });

  test('falls back to description property when no TSDoc', () => {
    const source = createSourceFile(`
const s = scenario('test.descprop', {
  description: 'Inline description',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].description).toBe('Inline description');
  });

  test('prefers TSDoc over description property', () => {
    const source = createSourceFile(`
/** TSDoc description */
const s = scenario('test.both', {
  description: 'Inline description',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].description).toBe('TSDoc description');
  });

  test('parses @accepts tags from TSDoc in scenario', () => {
    const source = createSourceFile(`
/** @accepts Users can purchase items */
const s = scenario('test.accepts', {
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].accepts).toEqual(['Users can purchase items']);
  });

  test('defaults accepts to empty array when not present', () => {
    const source = createSourceFile(`
const s = scenario('test.noacc', {
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].accepts).toEqual([]);
  });

  test('uses description property when no variable name', () => {
    const source = createSourceFile(`
export default scenario('test.novar', {
  description: 'Default export description',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].description).toBe('Default export description');
  });
});
