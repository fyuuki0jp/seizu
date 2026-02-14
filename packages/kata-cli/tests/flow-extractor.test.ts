import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { parseContracts } from '../src/doc/parser/contract-parser';
import { parseScenarios } from '../src/doc/parser/scenario-parser';

function createSourceFile(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'flow-fixture.ts',
    source,
    ts.ScriptTarget.ES2022,
    true
  );
}

describe('flow extractors', () => {
  test('extracts deterministic contract and scenario flows', () => {
    const source = createSourceFile(`
import { define, err, pass, scenario, step } from 'kata';

type S = { readonly ok: boolean; readonly items: number[]; readonly flag: boolean };
type I = { readonly n: number; readonly flag: boolean };
type E = { readonly tag: 'Bad' };

const add = define<S, I, E>({
  id: 'demo.add',
  pre: [
    (s) => (s.ok ? pass : err({ tag: 'Bad' as const })),
  ],
  transition: (state, input) => {
    if (input.flag) {
      return { ...state, items: [...state.items, input.n] };
    }
    return { ...state };
  },
  post: [(before, after) => after.items.length >= before.items.length],
  invariant: [(s) => s.items.length >= 0],
});

const flow = scenario<S, I>({
  id: 'demo.flow',
  flow: (input) => {
    const steps = [];
    steps.push(step(add, { n: 1, flag: false }));
    if (input.flag) {
      steps.push(step(add, { n: 2, flag: true }));
    }
    return steps;
  },
});
`);

    const contracts = parseContracts(source);
    const scenarios = parseScenarios(source);

    expect(contracts).toHaveLength(1);
    expect(scenarios).toHaveLength(1);

    const contractFlow = contracts[0].flow;
    const scenarioFlow = scenarios[0].flow;

    expect(contractFlow).toBeDefined();
    expect(scenarioFlow).toBeDefined();

    expect(contractFlow?.summary.branchCount).toBeGreaterThan(0);
    expect(contractFlow?.summary.errorPathCount).toBe(1);
    expect(contractFlow?.mermaid).toContain('pre.1');
    expect(contractFlow?.mermaid).toContain('transition');

    expect(scenarioFlow?.summary.branchCount).toBeGreaterThan(0);
    expect(scenarioFlow?.mermaid).toContain('step demo.add');

    const contracts2 = parseContracts(source);
    const scenarios2 = parseScenarios(source);
    expect(contracts[0].flow?.hash).toBe(contracts2[0].flow?.hash);
    expect(scenarios[0].flow?.hash).toBe(scenarios2[0].flow?.hash);
  });

  test('marks unsupported syntax in contract transition', () => {
    const source = createSourceFile(`
import { define, pass } from 'kata';

type S = { readonly n: number };
type I = { readonly n: number };

type E = never;

const c = define<S, I, E>({
  id: 'demo.unsupported',
  pre: [(s) => pass],
  transition: (state, input) => {
    switch (input.n) {
      case 1:
        return state;
      default:
        return { ...state, n: input.n };
    }
  },
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].flow?.summary.unsupportedCount).toBeGreaterThan(0);
    expect(contracts[0].flow?.mermaid).toContain('unsupported');
  });
});
