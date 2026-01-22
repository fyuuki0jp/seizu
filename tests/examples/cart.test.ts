import { beforeEach, describe, expect, it } from 'vitest';
import type { CartCommand } from '../../examples/cart/commands';
import { decider } from '../../examples/cart/decider';
import type { CartError } from '../../examples/cart/errors';
import type { CartEvent } from '../../examples/cart/events';
import type { CartState } from '../../examples/cart/state';
import { reducer } from '../../examples/cart/state';
import { Engine, InMemoryEventStore } from '../../src';

describe('Cart example integration', () => {
  let engine: Engine<CartCommand, CartEvent, CartState, CartError>;

  beforeEach(() => {
    engine = new Engine(new InMemoryEventStore(), {
      initialState: { exists: false, userId: null, items: new Map() },
      reducer,
      decider,
    });
  });

  it('should create cart and add items', async () => {
    // Given
    const cartId = 'cart-1';

    // When
    const createResult = await engine.execute({
      type: 'CreateCart',
      streamId: cartId,
      userId: 'user-1',
    });
    const addResult = await engine.execute({
      type: 'AddItem',
      streamId: cartId,
      itemId: 'item-1',
      quantity: 2,
      price: 100,
    });

    // Then
    expect(createResult.ok).toBe(true);
    expect(addResult.ok).toBe(true);

    const state = await engine.getState(cartId);
    expect(state.exists).toBe(true);
    expect(state.items.size).toBe(1);
    expect(state.items.get('item-1')).toEqual({
      itemId: 'item-1',
      quantity: 2,
      price: 100,
    });
  });

  it('should fail to add item to non-existent cart', async () => {
    // Given
    const cartId = 'non-existent';

    // When
    const result = await engine.execute({
      type: 'AddItem',
      streamId: cartId,
      itemId: 'item-1',
      quantity: 1,
      price: 100,
    });

    // Then
    expect(result.ok).toBe(false);
  });
});
