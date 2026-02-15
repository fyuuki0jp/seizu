import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { parseContracts } from '../src/doc/parser/contract-parser';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

describe('parseContracts', () => {
  test('parses a simple define() call', () => {
    const source = createSourceFile(`
import { define, err, pass } from 'kata';

/** カートを作成する */
const createCart = define<CartState, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  pre: [
    /** カートがまだ存在していないこと */
    (s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const })),
  ],
  transition: (state, input) => ({ ...state, exists: true }),
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);

    const contract = contracts[0];
    expect(contract.id).toBe('cart.create');
    expect(contract.variableName).toBe('createCart');
    expect(contract.description).toBe('カートを作成する');
    expect(contract.typeInfo.stateTypeName).toBe('CartState');
    expect(contract.typeInfo.inputTypeName).toBe('{ userId: string }');
    expect(contract.typeInfo.errorTypeName).toBe('AlreadyExists');

    expect(contract.guards).toHaveLength(1);
    expect(contract.guards[0].description).toBe(
      'カートがまだ存在していないこと'
    );
    expect(contract.guards[0].errorTags).toEqual(['AlreadyExists']);
    expect(contract.guards[0].kind).toBe('inline');

    expect(contract.conditions).toHaveLength(0);
    expect(contract.invariants).toHaveLength(0);
  });

  test('parses contract with post and invariant', () => {
    const source = createSourceFile(`
import { define, err, pass } from 'kata';

const addItem = define<CartState, Input, Error>({
  id: 'cart.addItem',
  pre: [
    /** カートが存在していること */
    (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const })),
    /** アイテムが重複していないこと */
    (s, i) => (!s.items.has(i.itemId) ? pass : err({ tag: 'DuplicateItem' as const, itemId: i.itemId })),
  ],
  transition: (state, input) => state,
  post: [
    /** アイテム数が1つ増加する */
    (before, after) => after.items.size === before.items.size + 1,
  ],
  invariant: [
    /** すべてのアイテムの数量が正の値である */
    (s) => true,
  ],
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);

    const contract = contracts[0];
    expect(contract.id).toBe('cart.addItem');

    expect(contract.guards).toHaveLength(2);
    expect(contract.guards[0].description).toBe('カートが存在していること');
    expect(contract.guards[0].errorTags).toEqual(['CartNotFound']);
    expect(contract.guards[1].description).toBe('アイテムが重複していないこと');
    expect(contract.guards[1].errorTags).toEqual(['DuplicateItem']);

    expect(contract.conditions).toHaveLength(1);
    expect(contract.conditions[0].description).toBe('アイテム数が1つ増加する');

    expect(contract.invariants).toHaveLength(1);
    expect(contract.invariants[0].description).toBe(
      'すべてのアイテムの数量が正の値である'
    );
  });

  test('parses multiple contracts in one file', () => {
    const source = createSourceFile(`
import { define, err, pass } from 'kata';

const a = define<S, I, E>({
  id: 'domain.a',
  pre: [],
  transition: (s, i) => s,
});

const b = define<S, I, E>({
  id: 'domain.b',
  pre: [],
  transition: (s, i) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(2);
    expect(contracts[0].id).toBe('domain.a');
    expect(contracts[1].id).toBe('domain.b');
  });

  test('handles contract without TSDoc', () => {
    const source = createSourceFile(`
import { define, err, pass } from 'kata';

const createCart = define<S, I, E>({
  id: 'cart.create',
  pre: [
    (s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const })),
  ],
  transition: (s, i) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].description).toBeUndefined();
    expect(contracts[0].guards[0].description).toBeUndefined();
    expect(contracts[0].guards[0].errorTags).toEqual(['AlreadyExists']);
  });

  test('handles contract without type arguments', () => {
    const source = createSourceFile(`
const x = define({
  id: 'test',
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].typeInfo.stateTypeName).toBe('unknown');
  });

  test('parses contract with reference guards (identifiers in pre/post/invariant)', () => {
    const source = createSourceFile(`
import { define, err, pass } from 'kata';

/** Cart must exist */
const cartExistsGuard = (s) => s.exists ? pass : err({ tag: 'CartNotFound' as const });

/** Count increases */
const countUpCondition = (before, after) => after.items.size > before.items.size;

/** Qty positive */
const qtyPositiveInvariant = (s) => true;

const addItem = define<S, I, E>({
  id: 'cart.addItem',
  pre: [cartExistsGuard],
  transition: (s) => s,
  post: [countUpCondition],
  invariant: [qtyPositiveInvariant],
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    const c = contracts[0];

    expect(c.guards).toHaveLength(1);
    expect(c.guards[0].kind).toBe('reference');
    expect(c.guards[0].referenceName).toBe('cartExistsGuard');
    expect(c.guards[0].description).toBe('Cart must exist');
    expect(c.guards[0].errorTags).toEqual(['CartNotFound']);

    expect(c.conditions).toHaveLength(1);
    expect(c.conditions[0].kind).toBe('reference');
    expect(c.conditions[0].referenceName).toBe('countUpCondition');
    expect(c.conditions[0].description).toBe('Count increases');

    expect(c.invariants).toHaveLength(1);
    expect(c.invariants[0].kind).toBe('reference');
    expect(c.invariants[0].referenceName).toBe('qtyPositiveInvariant');
    expect(c.invariants[0].description).toBe('Qty positive');
  });

  test('returns empty for define() with no arguments', () => {
    const source = createSourceFile(`const x = define();`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(0);
  });

  test('returns empty for define() with non-object argument', () => {
    const source = createSourceFile(`const x = define('string');`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(0);
  });

  test('returns empty for define() without id property', () => {
    const source = createSourceFile(`
const x = define({
  pre: [],
  transition: (s) => s,
});
`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(0);
  });

  test('handles define() not inside a variable declaration', () => {
    const source = createSourceFile(`
export default define<S, I, E>({
  id: 'exported.contract',
  pre: [],
  transition: (s) => s,
});
`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].variableName).toBeUndefined();
    expect(contracts[0].description).toBeUndefined();
  });

  test('handles guard with non-string id property value', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.guard',
  pre: [
    { id: someVariable, check: (s) => true, error: () => ({ tag: 'E' }) },
  ],
  transition: (s) => s,
});
`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
  });

  test('handles guards that are function expressions', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.funcexpr',
  pre: [
    function guard(s) { return s.exists ? pass : err({ tag: 'NotFound' as const }); },
  ],
  transition: (s) => s,
});
`);
    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].guards[0].errorTags).toEqual(['NotFound']);
    expect(contracts[0].guards[0].kind).toBe('inline');
  });

  test('falls back to description property when no TSDoc', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.descprop',
  description: 'Inline description',
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].description).toBe('Inline description');
  });

  test('parses accepts field', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.accepts',
  accepts: ['Requirement A', 'Requirement B'],
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].accepts).toEqual(['Requirement A', 'Requirement B']);
  });

  test('parses accepts with as const', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.asconst',
  accepts: ['Immutable req'] as const,
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].accepts).toEqual(['Immutable req']);
  });

  test('defaults accepts to empty array when not present', () => {
    const source = createSourceFile(`
const x = define<S, I, E>({
  id: 'test.noacc',
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].accepts).toEqual([]);
  });

  test('prefers TSDoc over description property', () => {
    const source = createSourceFile(`
/** TSDoc description */
const x = define<S, I, E>({
  id: 'test.both',
  description: 'Inline description',
  pre: [],
  transition: (s) => s,
});
`);

    const contracts = parseContracts(source);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].description).toBe('TSDoc description');
  });
});
