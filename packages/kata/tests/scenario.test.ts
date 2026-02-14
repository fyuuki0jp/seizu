import { describe, expect, test } from 'vitest';
import { define, err, pass, scenario, step } from '../src/index';

type CartItem = { readonly qty: number; readonly price: number };
type CartState = {
  readonly exists: boolean;
  readonly items: ReadonlyMap<string, CartItem>;
};

type AlreadyExists = { readonly tag: 'AlreadyExists' };
type CartNotFound = { readonly tag: 'CartNotFound' };
type DuplicateItem = {
  readonly tag: 'DuplicateItem';
  readonly itemId: string;
};

const createCart = define<CartState, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  pre: [(s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const }))],
  transition: (state, input) => ({
    ...state,
    exists: true,
  }),
});

const addItem = define<
  CartState,
  { itemId: string; qty: number; price: number },
  CartNotFound | DuplicateItem
>({
  id: 'cart.addItem',
  pre: [
    (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const })),
    (s, i) =>
      !s.items.has(i.itemId)
        ? pass
        : err({ tag: 'DuplicateItem' as const, itemId: i.itemId }),
  ],
  transition: (state, input) => ({
    ...state,
    items: new Map([
      ...state.items,
      [input.itemId, { qty: input.qty, price: input.price }],
    ]),
  }),
});

const emptyState: CartState = { exists: false, items: new Map() };

describe('scenario', () => {
  test('all steps succeed → ok: true', () => {
    const s = scenario({
      id: 'cart.normalPurchase',
      description: '通常の購入フロー',
      initial: emptyState,
      steps: [
        step(createCart, { userId: 'alice' }),
        step(addItem, { itemId: 'apple', qty: 3, price: 1.5 }),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(true);
    expect(result.id).toBe('cart.normalPurchase');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].outcome).toBe('ok');
    expect(result.steps[1].outcome).toBe('ok');
  });

  test('state is threaded through steps', () => {
    const s = scenario({
      id: 'cart.multiItem',
      initial: emptyState,
      steps: [
        step(createCart, { userId: 'bob' }),
        step(addItem, { itemId: 'apple', qty: 1, price: 1.0 }),
        step(addItem, { itemId: 'banana', qty: 2, price: 0.5 }),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(true);
    expect(result.finalState.exists).toBe(true);
    expect(result.finalState.items.size).toBe(2);
    expect(result.finalState.items.get('apple')).toEqual({
      qty: 1,
      price: 1.0,
    });
    expect(result.finalState.items.get('banana')).toEqual({
      qty: 2,
      price: 0.5,
    });
  });

  test('unexpected error → unexpected_error, ok: false', () => {
    const s = scenario({
      id: 'cart.addWithoutCreate',
      initial: emptyState,
      steps: [step(addItem, { itemId: 'apple', qty: 1, price: 1.0 })],
    });

    const result = s.run();
    expect(result.ok).toBe(false);
    expect(result.steps[0].outcome).toBe('unexpected_error');
    expect(result.steps[0].error).toEqual({ tag: 'CartNotFound' });
  });

  test('expected error → error, ok: true', () => {
    const s = scenario({
      id: 'cart.duplicateCreate',
      initial: { exists: true, items: new Map() },
      steps: [
        step(
          createCart,
          { userId: 'alice' },
          { expect: { error: 'AlreadyExists' } }
        ),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(true);
    expect(result.steps[0].outcome).toBe('error');
    expect(result.steps[0].error).toEqual({ tag: 'AlreadyExists' });
  });

  test('expected error but succeeds → unexpected_ok', () => {
    const s = scenario({
      id: 'cart.expectErrorButOk',
      initial: emptyState,
      steps: [
        step(
          createCart,
          { userId: 'alice' },
          { expect: { error: 'AlreadyExists' } }
        ),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(false);
    expect(result.steps[0].outcome).toBe('unexpected_ok');
  });

  test('wrong error tag → wrong_error', () => {
    const s = scenario({
      id: 'cart.wrongError',
      initial: emptyState,
      steps: [
        step(
          addItem,
          { itemId: 'apple', qty: 1, price: 1.0 },
          { expect: { error: 'DuplicateItem' } }
        ),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(false);
    expect(result.steps[0].outcome).toBe('wrong_error');
    expect(result.steps[0].error).toEqual({ tag: 'CartNotFound' });
  });

  test('empty steps → ok: true', () => {
    const s = scenario({
      id: 'cart.empty',
      initial: emptyState,
      steps: [],
    });

    const result = s.run();
    expect(result.ok).toBe(true);
    expect(result.steps).toHaveLength(0);
    expect(result.finalState).toBe(emptyState);
  });

  test('metadata accessible on scenario object', () => {
    const s = scenario({
      id: 'cart.normalPurchase',
      description: '通常の購入フロー',
      initial: emptyState,
      steps: [step(createCart, { userId: 'alice' })],
    });

    expect(s.id).toBe('cart.normalPurchase');
    expect(s.description).toBe('通常の購入フロー');
    expect(s.initial).toBe(emptyState);
    expect(s.steps).toHaveLength(1);
  });

  test('state does not change on expected error', () => {
    const activeState: CartState = { exists: true, items: new Map() };
    const s = scenario({
      id: 'cart.errorNoStateChange',
      initial: activeState,
      steps: [
        step(
          createCart,
          { userId: 'alice' },
          { expect: { error: 'AlreadyExists' } }
        ),
      ],
    });

    const result = s.run();
    expect(result.ok).toBe(true);
    expect(result.finalState).toBe(activeState);
  });

  test('step results include contractId', () => {
    const s = scenario({
      id: 'cart.ids',
      initial: emptyState,
      steps: [
        step(createCart, { userId: 'alice' }),
        step(addItem, { itemId: 'apple', qty: 1, price: 1.0 }),
      ],
    });

    const result = s.run();
    expect(result.steps[0].contractId).toBe('cart.create');
    expect(result.steps[1].contractId).toBe('cart.addItem');
  });
});
