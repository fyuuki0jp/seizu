import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { parseTestSuites } from '../src/doc/parser/test-parser';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

describe('parseTestSuites', () => {
  test('parses describe/test blocks', () => {
    const source = createSourceFile(`
describe('cart.addItem', () => {
  test('adds item to existing cart', () => {
    const state = expectOk(result);
    expect(state).toBeDefined();
  });

  test('returns CartNotFound when cart does not exist', () => {
    const error = expectErr(result);
    expect(error).toBeDefined();
  });
});
`);

    const suites = parseTestSuites(source);
    expect(suites).toHaveLength(1);
    expect(suites[0].contractName).toBe('cart.addItem');
    expect(suites[0].tests).toHaveLength(2);

    expect(suites[0].tests[0].name).toBe('adds item to existing cart');
    expect(suites[0].tests[0].classification).toBe('success');

    expect(suites[0].tests[1].name).toBe(
      'returns CartNotFound when cart does not exist'
    );
    expect(suites[0].tests[1].classification).toBe('failure');
  });

  test('classifies test with isOk as success', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test('creates cart', () => {
    const result = createCart(state, input);
    expect(isOk(result)).toBe(true);
  });
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests[0].classification).toBe('success');
  });

  test('classifies test with isErr as failure', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test('rejects duplicate', () => {
    const result = createCart(state, input);
    expect(isErr(result)).toBe(true);
  });
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests[0].classification).toBe('failure');
  });

  test('classifies unknown when no expectOk/expectErr', () => {
    const source = createSourceFile(`
describe('contract metadata', () => {
  test('exposes correct metadata', () => {
    expect(addItem.id).toBe('cart.addItem');
  });
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests[0].classification).toBe('unknown');
  });

  test('parses multiple describe blocks', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test('creates cart', () => { expectOk(result); });
});

describe('cart.addItem', () => {
  test('adds item', () => { expectOk(result); });
});
`);

    const suites = parseTestSuites(source);
    expect(suites).toHaveLength(2);
    expect(suites[0].contractName).toBe('cart.create');
    expect(suites[1].contractName).toBe('cart.addItem');
  });

  test('handles it() as alias for test()', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  it('creates cart', () => { expectOk(result); });
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests).toHaveLength(1);
    expect(suites[0].tests[0].name).toBe('creates cart');
    expect(suites[0].tests[0].classification).toBe('success');
  });

  test('handles test.skip()', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test.skip('pending test', () => {});
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests).toHaveLength(1);
    expect(suites[0].tests[0].name).toBe('pending test');
    expect(suites[0].tests[0].classification).toBe('unknown');
  });

  test('handles test.todo()', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test.todo('future test', () => {});
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests).toHaveLength(1);
    expect(suites[0].tests[0].name).toBe('future test');
    expect(suites[0].tests[0].classification).toBe('unknown');
  });

  test('classifies unknown when both isOk and isErr appear', () => {
    const source = createSourceFile(`
describe('cart.create', () => {
  test('checks both outcomes', () => {
    expect(isOk(r1)).toBe(true);
    expect(isErr(r2)).toBe(true);
  });
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests[0].classification).toBe('unknown');
  });

  test('handles describe with non-function callback', () => {
    const source = createSourceFile(`
describe('cart.create', someVariable);
`);

    const suites = parseTestSuites(source);
    expect(suites).toHaveLength(0);
  });

  test('handles describe with non-string label', () => {
    const source = createSourceFile(`
describe(someVar, () => {
  test('test', () => {});
});
`);

    const suites = parseTestSuites(source);
    expect(suites).toHaveLength(0);
  });

  test('handles it.skip()', () => {
    const source = createSourceFile(`
describe('domain.op', () => {
  it.skip('skipped it test', () => {});
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests).toHaveLength(1);
    expect(suites[0].tests[0].name).toBe('skipped it test');
    expect(suites[0].tests[0].classification).toBe('unknown');
  });

  test('handles test with non-string label', () => {
    const source = createSourceFile(`
describe('domain.op', () => {
  test(someVar, () => {});
});
`);

    const suites = parseTestSuites(source);
    expect(suites[0].tests).toHaveLength(0);
  });
});
