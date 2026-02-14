import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { parseScenarios } from '../src/doc/parser/scenario-parser';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

describe('parseScenarios', () => {
  test('parses a scenario with flow and steps', () => {
    const source = createSourceFile(`
import { define, scenario, step } from 'kata';

const createCart = define<S, I, E>({
  id: 'cart.create',
  pre: [],
  transition: (s) => s,
});

const addItem = define<S, I, E>({
  id: 'cart.addItem',
  pre: [],
  transition: (s) => s,
});

/** 通常の購入フロー */
const normalPurchase = scenario({
  id: 'cart.normalPurchase',
  flow: (input) => [
    step(createCart, { userId: 'alice' }),
    step(addItem, { itemId: 'apple', qty: 3, price: 1.5 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);

    const s = scenarios[0];
    expect(s.id).toBe('cart.normalPurchase');
    expect(s.variableName).toBe('normalPurchase');
    expect(s.description).toBe('通常の購入フロー');
    expect(s.steps).toHaveLength(2);

    // Step 1: createCart resolved to cart.create via varMap
    expect(s.steps[0].contractId).toBe('cart.create');
    expect(s.steps[0].inputLiteral).toContain('userId');

    // Step 2: addItem resolved to cart.addItem via varMap
    expect(s.steps[1].contractId).toBe('cart.addItem');
    expect(s.steps[1].inputLiteral).toContain('apple');
  });

  test('parses flow with block body (return statement)', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.block',
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
    expect(scenarios[0].steps[0].contractId).toBe('create');
  });

  test('parses multiple scenarios', () => {
    const source = createSourceFile(`
const a = scenario({
  id: 'flow.a',
  flow: () => [],
});

const b = scenario({
  id: 'flow.b',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].id).toBe('flow.a');
    expect(scenarios[1].id).toBe('flow.b');
  });

  test('resolves contract variable to id via define() in same file', () => {
    const source = createSourceFile(`
const myContract = define<S, I, E>({
  id: 'domain.action',
  pre: [],
  transition: (s) => s,
});

const s = scenario({
  id: 'test.resolve',
  flow: () => [
    step(myContract, { data: 1 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractId).toBe('domain.action');
  });

  test('falls back to variable name when define() not found', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.fallback',
  flow: () => [
    step(unknownContract, { data: 1 }),
  ],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractId).toBe('unknownContract');
  });

  test('returns empty for scenario() with no arguments', () => {
    const source = createSourceFile(`const s = scenario();`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('returns empty for scenario() with non-object argument', () => {
    const source = createSourceFile(`const s = scenario('string');`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('returns empty for scenario() without id property', () => {
    const source = createSourceFile(`
const s = scenario({
  flow: () => [],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(0);
  });

  test('handles step with non-identifier contract arg', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.propaccess',
  flow: () => [
    step(contracts.create, { data: 1 }),
  ],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps[0].contractId).toBe('contracts.create');
  });

  test('filters out non-step-call elements in flow array', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.filter',
  flow: () => [
    someVariable,
    step(create, { data: 1 }),
  ],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps).toHaveLength(1);
    expect(scenarios[0].steps[0].contractId).toBe('create');
  });

  test('handles step with insufficient arguments', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.noargs',
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
export default scenario({
  id: 'test.novar',
  flow: () => [],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].variableName).toBeUndefined();
    expect(scenarios[0].description).toBeUndefined();
  });

  test('handles non-step function calls in flow array', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.otherfn',
  flow: () => [
    otherFunction(create, {}),
  ],
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('returns empty steps when no flow property', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.noflow',
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('returns empty steps when flow is not an arrow function', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.notarrow',
  flow: someVariable,
});
`);
    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(0);
  });

  test('parses flow with imperative push pattern', () => {
    const source = createSourceFile(`
const create = define<S, I, E>({
  id: 'test.create',
  pre: [],
  transition: (s) => s,
});

const update = define<S, I, E>({
  id: 'test.update',
  pre: [],
  transition: (s) => s,
});

const s = scenario({
  id: 'test.push',
  flow: (input) => {
    const steps = [];
    steps.push(step(create, { data: 1 }));
    steps.push(step(update, { data: 2 }));
    return steps;
  },
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(2);
    expect(scenarios[0].steps[0].contractId).toBe('test.create');
    expect(scenarios[0].steps[1].contractId).toBe('test.update');
  });

  test('parses flow with conditional push pattern', () => {
    const source = createSourceFile(`
const create = define<S, I, E>({
  id: 'test.create',
  pre: [],
  transition: (s) => s,
});

const update = define<S, I, E>({
  id: 'test.update',
  pre: [],
  transition: (s) => s,
});

const s = scenario({
  id: 'test.condpush',
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

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    // Picks up both top-level and nested push calls
    expect(scenarios[0].steps).toHaveLength(2);
    expect(scenarios[0].steps[0].contractId).toBe('test.create');
    expect(scenarios[0].steps[1].contractId).toBe('test.update');
  });

  test('falls back to description property when no TSDoc', () => {
    const source = createSourceFile(`
const s = scenario({
  id: 'test.descprop',
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
const s = scenario({
  id: 'test.both',
  description: 'Inline description',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].description).toBe('TSDoc description');
  });

  test('uses description property when no variable name', () => {
    const source = createSourceFile(`
export default scenario({
  id: 'test.novar',
  description: 'Default export description',
  flow: () => [],
});
`);

    const scenarios = parseScenarios(source);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].description).toBe('Default export description');
  });
});
