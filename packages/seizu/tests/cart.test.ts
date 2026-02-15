import { describe, expect, test } from 'vitest';
import { check, define, ensure, err, guard, pass } from '../src/index';
import { expectErr, expectOk } from '../src/testing';

// --- State ---
type CartItem = { readonly qty: number; readonly price: number };

type CartState = {
  readonly exists: boolean;
  readonly userId?: string;
  readonly items: ReadonlyMap<string, CartItem>;
};

// --- Errors ---
type AlreadyExists = { readonly tag: 'AlreadyExists' };
type CartNotFound = { readonly tag: 'CartNotFound' };
type DuplicateItem = {
  readonly tag: 'DuplicateItem';
  readonly itemId: string;
};
type ItemNotFound = {
  readonly tag: 'ItemNotFound';
  readonly itemId: string;
};

// --- Contracts ---
const createCart = define<CartState, { userId: string }, AlreadyExists>(
  'cart.create',
  {
    pre: [
      guard('not exists', (s) =>
        !s.exists ? pass : err({ tag: 'AlreadyExists' as const })
      ),
    ],
    transition: (state, input) => ({
      ...state,
      exists: true,
      userId: input.userId,
    }),
  }
);

const addItem = define<
  CartState,
  { itemId: string; qty: number; price: number },
  CartNotFound | DuplicateItem
>('cart.addItem', {
  pre: [
    guard('cart exists', (s) =>
      s.exists ? pass : err({ tag: 'CartNotFound' as const })
    ),
    guard('no duplicate', (s, i) =>
      !s.items.has(i.itemId)
        ? pass
        : err({ tag: 'DuplicateItem' as const, itemId: i.itemId })
    ),
  ],
  transition: (state, input) => ({
    ...state,
    items: new Map([
      ...state.items,
      [input.itemId, { qty: input.qty, price: input.price }],
    ]),
  }),
  post: [
    check(
      'item count increases',
      (before, after) =>
        after.items.size === before.items.size + 1 ||
        'item count did not increase by 1'
    ),
  ],
  invariant: [
    ensure(
      'qty positive',
      (s) =>
        [...s.items.values()].every((i) => i.qty > 0) ||
        'some item has non-positive qty'
    ),
  ],
});

const removeItem = define<
  CartState,
  { itemId: string },
  CartNotFound | ItemNotFound
>('cart.removeItem', {
  pre: [
    guard('cart exists', (s) =>
      s.exists ? pass : err({ tag: 'CartNotFound' as const })
    ),
    guard('item exists', (s, i) =>
      s.items.has(i.itemId)
        ? pass
        : err({ tag: 'ItemNotFound' as const, itemId: i.itemId })
    ),
  ],
  transition: (state, input) => {
    const items = new Map(state.items);
    items.delete(input.itemId);
    return { ...state, items };
  },
  post: [
    check(
      'item count decreases',
      (before, after) =>
        after.items.size === before.items.size - 1 ||
        'item count did not decrease by 1'
    ),
  ],
});

// --- Tests ---
const emptyState: CartState = { exists: false, items: new Map() };

describe('cart.create', () => {
  test('creates a cart when it does not exist', () => {
    const state = expectOk(createCart(emptyState, { userId: 'alice' }));
    expect(state.exists).toBe(true);
    expect(state.userId).toBe('alice');
  });

  test('returns AlreadyExists when cart exists', () => {
    const activeCart: CartState = { exists: true, items: new Map() };
    const error = expectErr(createCart(activeCart, { userId: 'alice' }));
    expect(error).toEqual({ tag: 'AlreadyExists' });
  });
});

describe('cart.addItem', () => {
  const activeCart: CartState = { exists: true, items: new Map() };

  test('adds item to existing cart', () => {
    const state = expectOk(
      addItem(activeCart, { itemId: 'apple', qty: 3, price: 1.5 })
    );
    expect(state.items.get('apple')).toEqual({ qty: 3, price: 1.5 });
    expect(state.items.size).toBe(1);
  });

  test('returns CartNotFound when cart does not exist', () => {
    const error = expectErr(
      addItem(emptyState, { itemId: 'apple', qty: 1, price: 1.0 })
    );
    expect(error).toEqual({ tag: 'CartNotFound' });
  });

  test('returns DuplicateItem when item already exists', () => {
    const state: CartState = {
      exists: true,
      items: new Map([['apple', { qty: 1, price: 1.0 }]]),
    };
    const error = expectErr(
      addItem(state, { itemId: 'apple', qty: 2, price: 1.5 })
    );
    expect(error).toEqual({ tag: 'DuplicateItem', itemId: 'apple' });
  });
});

describe('cart.removeItem', () => {
  const stateWithItem: CartState = {
    exists: true,
    items: new Map([['apple', { qty: 3, price: 1.5 }]]),
  };

  test('removes item from cart', () => {
    const state = expectOk(removeItem(stateWithItem, { itemId: 'apple' }));
    expect(state.items.has('apple')).toBe(false);
    expect(state.items.size).toBe(0);
  });

  test('returns CartNotFound when cart does not exist', () => {
    const error = expectErr(removeItem(emptyState, { itemId: 'apple' }));
    expect(error).toEqual({ tag: 'CartNotFound' });
  });

  test('returns ItemNotFound when item does not exist', () => {
    const activeCart: CartState = { exists: true, items: new Map() };
    const error = expectErr(removeItem(activeCart, { itemId: 'apple' }));
    expect(error).toEqual({ tag: 'ItemNotFound', itemId: 'apple' });
  });
});

describe('contract metadata', () => {
  test('addItem exposes correct metadata', () => {
    expect(addItem.name).toBe('cart.addItem');
    expect(addItem.pre).toHaveLength(2);
    expect(addItem.post).toHaveLength(1);
    expect(addItem.invariant).toHaveLength(1);
    expect(typeof addItem.transition).toBe('function');
  });
});
