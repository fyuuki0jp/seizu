// Fixture: Contract definitions with TSDoc comments
// This file simulates a user's domain contract definitions

import { define, err, pass } from 'kata';

type CartItem = { readonly qty: number; readonly price: number };

type CartState = {
  readonly exists: boolean;
  readonly userId?: string;
  readonly items: ReadonlyMap<string, CartItem>;
};

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

/**
 * カートを作成する
 *
 * 新しいショッピングカートを作成する。
 * 既にカートが存在する場合はエラーを返す。
 */
export const createCart = define<CartState, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  accepts: [
    'ユーザーは新しいカートを作成できる',
    '既にカートが存在する場合はエラーが返される',
  ],
  pre: [
    /** カートがまだ存在していないこと */
    (s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const })),
  ],
  transition: (state, input) => ({
    ...state,
    exists: true,
    userId: input.userId,
  }),
});

/**
 * カートにアイテムを追加する
 *
 * カートが存在し、アイテムが重複していない場合にのみ
 * 新しいアイテムを追加できる。
 */
export const addItem = define<
  CartState,
  { itemId: string; qty: number; price: number },
  CartNotFound | DuplicateItem
>({
  id: 'cart.addItem',
  accepts: ['カートに新しいアイテムを追加できる'] as const,
  pre: [
    /** カートが存在していること */
    (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const })),
    /** 同じアイテムが既にカートに存在していないこと */
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
  post: [
    /** アイテム数が1つ増加する */
    (before, after) => after.items.size === before.items.size + 1,
  ],
  invariant: [
    /** すべてのアイテムの数量が正の値である */
    (s) => [...s.items.values()].every((i) => i.qty > 0),
  ],
});

export const removeItem = define<
  CartState,
  { itemId: string },
  CartNotFound | ItemNotFound
>({
  id: 'cart.removeItem',
  pre: [
    (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const })),
    (s, i) =>
      s.items.has(i.itemId)
        ? pass
        : err({ tag: 'ItemNotFound' as const, itemId: i.itemId }),
  ],
  transition: (state, input) => {
    const items = new Map(state.items);
    items.delete(input.itemId);
    return { ...state, items };
  },
  post: [(before, after) => after.items.size === before.items.size - 1],
});
