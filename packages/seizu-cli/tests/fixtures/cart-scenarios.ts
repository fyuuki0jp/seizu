// Fixture: Scenario definitions composing cart contracts
import { define, err, guard, pass, scenario, step } from 'seizu';

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

const createCart = define<CartState, { userId: string }, AlreadyExists>(
  'cart.create',
  {
    pre: [
      guard('カートがまだ存在していないこと', (s) =>
        !s.exists ? pass : err({ tag: 'AlreadyExists' as const })
      ),
    ],
    transition: (state) => ({ ...state, exists: true }),
  }
);

const addItem = define<
  CartState,
  { itemId: string; qty: number; price: number },
  CartNotFound | DuplicateItem
>('cart.addItem', {
  pre: [
    guard('カートが存在していること', (s) =>
      s.exists ? pass : err({ tag: 'CartNotFound' as const })
    ),
    guard('同じアイテムが既にカートに存在していないこと', (s, i) =>
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
});

/**
 * 通常の購入フロー
 *
 * @accepts ユーザーは複数のアイテムをカートに入れて購入できる
 */
export const normalPurchase = scenario<CartState, { userId: string }>(
  'cart.normalPurchase',
  {
    flow: (input) => [
      step(createCart, { userId: input.userId }),
      step(addItem, { itemId: 'apple', qty: 3, price: 1.5 }),
      step(addItem, { itemId: 'banana', qty: 1, price: 0.8 }),
    ],
  }
);

/** 重複カート作成の検出 */
export const duplicateCartError = scenario<CartState, { userId: string }>(
  'cart.duplicateCreate',
  {
    flow: (input) => [
      step(createCart, { userId: input.userId }),
      step(createCart, { userId: input.userId }),
    ],
  }
);
