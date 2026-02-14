import { describe, expect, test } from 'vitest';
import { define, err, isErr, isOk, pass, scenario, step } from '../src/index';

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
  transition: (state) => ({
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
const activeState: CartState = { exists: true, items: new Map() };

type PurchaseInput = {
  userId: string;
  itemId: string;
  qty: number;
  price: number;
};

const purchase = scenario<CartState, PurchaseInput>({
  id: 'cart.purchase',
  description: '購入フロー',
  flow: (input) => [
    step(createCart, { userId: input.userId }),
    step(addItem, {
      itemId: input.itemId,
      qty: input.qty,
      price: input.price,
    }),
  ],
});

describe('scenario', () => {
  test('all steps succeed → isOk, final state returned', () => {
    const result = purchase(emptyState, {
      userId: 'alice',
      itemId: 'apple',
      qty: 3,
      price: 1.5,
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.exists).toBe(true);
      expect(result.value.items.size).toBe(1);
      expect(result.value.items.get('apple')).toEqual({ qty: 3, price: 1.5 });
    }
  });

  test('state is threaded through steps', () => {
    const multiAdd = scenario<CartState, { userId: string }>({
      id: 'cart.multiAdd',
      flow: (input) => [
        step(createCart, { userId: input.userId }),
        step(addItem, { itemId: 'apple', qty: 1, price: 1.0 }),
        step(addItem, { itemId: 'banana', qty: 2, price: 0.5 }),
      ],
    });

    const result = multiAdd(emptyState, { userId: 'bob' });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.items.size).toBe(2);
      expect(result.value.items.get('apple')).toEqual({ qty: 1, price: 1.0 });
      expect(result.value.items.get('banana')).toEqual({ qty: 2, price: 0.5 });
    }
  });

  test('step failure → isErr with ScenarioFailure', () => {
    // activeState already has cart → createCart fails at step 0
    const result2 = purchase(activeState, {
      userId: 'alice',
      itemId: 'apple',
      qty: 1,
      price: 1.0,
    });
    expect(isErr(result2)).toBe(true);
    if (isErr(result2)) {
      expect(result2.error.stepIndex).toBe(0);
      expect(result2.error.contractId).toBe('cart.create');
      expect(result2.error.error).toEqual({ tag: 'AlreadyExists' });
    }
  });

  test('empty flow → isOk, state unchanged', () => {
    const noop = scenario<CartState, void>({
      id: 'cart.noop',
      flow: () => [],
    });

    const result = noop(emptyState, undefined);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(emptyState);
    }
  });

  test('metadata accessible on scenario object', () => {
    expect(purchase.id).toBe('cart.purchase');
    expect(purchase.description).toBe('購入フロー');
    expect(typeof purchase.flow).toBe('function');
  });

  test('parameterized flow generates different steps based on input', () => {
    type BulkInput = {
      userId: string;
      items: { id: string; qty: number; price: number }[];
    };

    const bulkPurchase = scenario<CartState, BulkInput>({
      id: 'cart.bulkPurchase',
      flow: (input) => [
        step(createCart, { userId: input.userId }),
        ...input.items.map((item) =>
          step(addItem, { itemId: item.id, qty: item.qty, price: item.price })
        ),
      ],
    });

    const result = bulkPurchase(emptyState, {
      userId: 'alice',
      items: [
        { id: 'apple', qty: 1, price: 1.0 },
        { id: 'banana', qty: 2, price: 0.5 },
        { id: 'cherry', qty: 5, price: 2.0 },
      ],
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.items.size).toBe(3);
    }
  });

  test('dynamic step count with map', () => {
    type RepeatInput = { userId: string; count: number };

    const repeatAdd = scenario<CartState, RepeatInput>({
      id: 'cart.repeatAdd',
      flow: (input) => [
        step(createCart, { userId: input.userId }),
        ...Array.from({ length: input.count }, (_, i) =>
          step(addItem, { itemId: `item-${i}`, qty: 1, price: 1.0 })
        ),
      ],
    });

    const result = repeatAdd(emptyState, { userId: 'alice', count: 5 });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.items.size).toBe(5);
    }
  });

  test('failure at second step preserves error context', () => {
    // createCart succeeds, then addItem fails because cart already has item
    const stateWithItem: CartState = {
      exists: true,
      items: new Map([['apple', { qty: 1, price: 1.0 }]]),
    };

    const addOnly = scenario<CartState, { itemId: string }>({
      id: 'cart.addOnly',
      flow: (input) => [
        step(addItem, { itemId: input.itemId, qty: 1, price: 1.0 }),
      ],
    });

    const result = addOnly(stateWithItem, { itemId: 'apple' });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.stepIndex).toBe(0);
      expect(result.error.contractId).toBe('cart.addItem');
      expect(result.error.error).toEqual({
        tag: 'DuplicateItem',
        itemId: 'apple',
      });
    }
  });

  test('scenario is callable as a function', () => {
    expect(typeof purchase).toBe('function');
    const result = purchase(emptyState, {
      userId: 'alice',
      itemId: 'apple',
      qty: 1,
      price: 1.0,
    });
    expect(result).toHaveProperty('ok');
  });
});
