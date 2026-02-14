// Fixture: Scenario definitions composing cart contracts
import { define, err, pass, scenario, step } from 'kata';

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
  transition: (state) => ({ ...state, exists: true }),
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

/** 通常の購入フロー */
export const normalPurchase = scenario({
  id: 'cart.normalPurchase',
  description: '通常の購入フロー',
  initial: emptyState,
  steps: [
    step(createCart, { userId: 'alice' }),
    step(addItem, { itemId: 'apple', qty: 3, price: 1.5 }),
    step(addItem, { itemId: 'banana', qty: 1, price: 0.8 }),
  ],
});

/** 重複カート作成の検出 */
export const duplicateCartError = scenario({
  id: 'cart.duplicateCreate',
  description: '重複カート作成の検出',
  initial: emptyState,
  steps: [
    step(createCart, { userId: 'alice' }),
    step(
      createCart,
      { userId: 'alice' },
      { expect: { error: 'AlreadyExists' } }
    ),
  ],
});
