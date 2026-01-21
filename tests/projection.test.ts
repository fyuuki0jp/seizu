import { beforeEach, describe, expect, test } from 'vitest';
import type { DomainEvent } from '../src';
import { createMeta, EventBus } from '../src';
import { InMemoryProjectionStore } from '../src/core/in-memory-projection-store';
import { Projector } from '../src/core/projector';
import { defineProjection } from '../src/lib/projections';

// Test event types
type OrderPlaced = DomainEvent<
  'OrderPlaced',
  { orderId: string; amount: number }
>;
type OrderCancelled = DomainEvent<'OrderCancelled', { orderId: string }>;
type ItemAdded = DomainEvent<
  'ItemAdded',
  { orderId: string; itemId: string; qty: number }
>;

type OrderEvent = OrderPlaced | OrderCancelled | ItemAdded;

// Helper to create test events
const createOrderPlaced = (orderId: string, amount: number): OrderPlaced => ({
  type: 'OrderPlaced',
  data: { orderId, amount },
  meta: createMeta(),
});

const createOrderCancelled = (orderId: string): OrderCancelled => ({
  type: 'OrderCancelled',
  data: { orderId },
  meta: createMeta(),
});

const createItemAdded = (
  orderId: string,
  itemId: string,
  qty: number
): ItemAdded => ({
  type: 'ItemAdded',
  data: { orderId, itemId, qty },
  meta: createMeta(),
});

// Test state type
interface OrderSummaryState {
  orderId: string;
  totalAmount: number;
  itemCount: number;
  status: 'active' | 'cancelled';
}

describe('defineProjection', () => {
  test('creates a projection with correct properties', () => {
    const projection = defineProjection<OrderSummaryState, OrderEvent>(
      'OrderSummary',
      () => ({ orderId: '', totalAmount: 0, itemCount: 0, status: 'active' }),
      (state, event) => {
        switch (event.type) {
          case 'OrderPlaced':
            return {
              ...state,
              orderId: event.data.orderId,
              totalAmount: event.data.amount,
            };
          case 'OrderCancelled':
            return { ...state, status: 'cancelled' };
          case 'ItemAdded':
            return { ...state, itemCount: state.itemCount + event.data.qty };
          default:
            return state;
        }
      }
    );

    expect(projection.name).toBe('OrderSummary');
    expect(typeof projection.init).toBe('function');
    expect(typeof projection.apply).toBe('function');
    expect(projection.init()).toEqual({
      orderId: '',
      totalAmount: 0,
      itemCount: 0,
      status: 'active',
    });
  });

  test('apply function works correctly', () => {
    const projection = defineProjection<OrderSummaryState, OrderEvent>(
      'OrderSummary',
      () => ({ orderId: '', totalAmount: 0, itemCount: 0, status: 'active' }),
      (state, event) => {
        if (event.type === 'OrderPlaced') {
          return {
            ...state,
            orderId: event.data.orderId,
            totalAmount: event.data.amount,
          };
        }
        return state;
      }
    );

    const initial = projection.init();
    const event = createOrderPlaced('order-1', 100);
    const next = projection.apply(initial, event);

    expect(next).toEqual({
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 0,
      status: 'active',
    });
  });
});

describe('InMemoryProjectionStore', () => {
  let store: InMemoryProjectionStore<OrderSummaryState>;

  beforeEach(() => {
    store = new InMemoryProjectionStore<OrderSummaryState>();
  });

  test('get returns undefined for non-existent key', async () => {
    const result = await store.get('non-existent');
    expect(result).toBeUndefined();
  });

  test('set and get work correctly', async () => {
    const state: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    };

    await store.set('order-1', state);
    const result = await store.get('order-1');

    expect(result).toEqual(state);
  });

  test('set overwrites existing value', async () => {
    const state1: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    };
    const state2: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 200,
      itemCount: 5,
      status: 'cancelled',
    };

    await store.set('order-1', state1);
    await store.set('order-1', state2);
    const result = await store.get('order-1');

    expect(result).toEqual(state2);
  });

  test('delete removes the value', async () => {
    const state: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    };

    await store.set('order-1', state);
    await store.delete('order-1');
    const result = await store.get('order-1');

    expect(result).toBeUndefined();
  });

  test('getAll returns all values', async () => {
    const state1: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    };
    const state2: OrderSummaryState = {
      orderId: 'order-2',
      totalAmount: 200,
      itemCount: 3,
      status: 'active',
    };

    await store.set('order-1', state1);
    await store.set('order-2', state2);
    const result = await store.getAll();

    expect(result.size).toBe(2);
    expect(result.get('order-1')).toEqual(state1);
    expect(result.get('order-2')).toEqual(state2);
  });

  test('clear removes all values', async () => {
    const state1: OrderSummaryState = {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    };

    await store.set('order-1', state1);
    await store.set('order-2', state1);
    await store.clear();
    const result = await store.getAll();

    expect(result.size).toBe(0);
  });
});

describe('Projector', () => {
  let store: InMemoryProjectionStore<OrderSummaryState>;
  let projector: Projector<OrderSummaryState, OrderEvent>;

  const orderProjection = defineProjection<OrderSummaryState, OrderEvent>(
    'OrderSummary',
    () => ({ orderId: '', totalAmount: 0, itemCount: 0, status: 'active' }),
    (state, event) => {
      switch (event.type) {
        case 'OrderPlaced':
          return {
            ...state,
            orderId: event.data.orderId,
            totalAmount: event.data.amount,
          };
        case 'OrderCancelled':
          return { ...state, status: 'cancelled' };
        case 'ItemAdded':
          return { ...state, itemCount: state.itemCount + event.data.qty };
        default:
          return state;
      }
    }
  );

  beforeEach(() => {
    store = new InMemoryProjectionStore<OrderSummaryState>();
    projector = new Projector(
      orderProjection,
      store,
      (event) => event.data.orderId
    );
  });

  test('handle processes a single event correctly', async () => {
    const event = createOrderPlaced('order-1', 100);
    await projector.handle(event);

    const state = await store.get('order-1');
    expect(state).toEqual({
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 0,
      status: 'active',
    });
  });

  test('handle accumulates state from multiple events', async () => {
    await projector.handle(createOrderPlaced('order-1', 100));
    await projector.handle(createItemAdded('order-1', 'item-1', 3));
    await projector.handle(createItemAdded('order-1', 'item-2', 2));

    const state = await store.get('order-1');
    expect(state).toEqual({
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 5,
      status: 'active',
    });
  });

  test('handle manages multiple IDs independently', async () => {
    await projector.handle(createOrderPlaced('order-1', 100));
    await projector.handle(createOrderPlaced('order-2', 200));
    await projector.handle(createItemAdded('order-1', 'item-1', 3));
    await projector.handle(createOrderCancelled('order-2'));

    const state1 = await store.get('order-1');
    const state2 = await store.get('order-2');

    expect(state1).toEqual({
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 3,
      status: 'active',
    });

    expect(state2).toEqual({
      orderId: 'order-2',
      totalAmount: 200,
      itemCount: 0,
      status: 'cancelled',
    });
  });

  test('rebuild clears existing state and replays events', async () => {
    // Set some initial state
    await store.set('order-1', {
      orderId: 'order-1',
      totalAmount: 999,
      itemCount: 999,
      status: 'cancelled',
    });

    // Rebuild from events
    const events: OrderEvent[] = [
      createOrderPlaced('order-1', 100),
      createItemAdded('order-1', 'item-1', 5),
      createOrderPlaced('order-2', 200),
    ];

    await projector.rebuild(events);

    const state1 = await store.get('order-1');
    const state2 = await store.get('order-2');

    expect(state1).toEqual({
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 5,
      status: 'active',
    });

    expect(state2).toEqual({
      orderId: 'order-2',
      totalAmount: 200,
      itemCount: 0,
      status: 'active',
    });
  });

  test('rebuild with empty events clears all state', async () => {
    await store.set('order-1', {
      orderId: 'order-1',
      totalAmount: 100,
      itemCount: 2,
      status: 'active',
    });

    await projector.rebuild([]);

    const allState = await store.getAll();
    expect(allState.size).toBe(0);
  });

  test('definition getter returns the projection', () => {
    expect(projector.definition).toBe(orderProjection);
    expect(projector.definition.name).toBe('OrderSummary');
  });

  describe('subscribe', () => {
    test('subscribes to EventBus and handles events', async () => {
      const bus = new EventBus<OrderEvent>();

      const unsubscribe = projector.subscribe(bus, [
        'OrderPlaced',
        'ItemAdded',
      ]);

      // Publish events one at a time with waiting to avoid race conditions
      // (In real apps, events typically arrive sequentially over time)
      bus.publish(createOrderPlaced('order-1', 100));
      await new Promise((resolve) => setTimeout(resolve, 10));

      bus.publish(createItemAdded('order-1', 'item-1', 3));
      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = await store.get('order-1');
      expect(state).toEqual({
        orderId: 'order-1',
        totalAmount: 100,
        itemCount: 3,
        status: 'active',
      });

      unsubscribe();
    });

    test('unsubscribe stops handling events', async () => {
      const bus = new EventBus<OrderEvent>();

      const unsubscribe = projector.subscribe(bus, [
        'OrderPlaced',
        'ItemAdded',
      ]);

      bus.publish(createOrderPlaced('order-1', 100));
      await new Promise((resolve) => setTimeout(resolve, 10));

      unsubscribe();

      bus.publish(createItemAdded('order-1', 'item-1', 3));
      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = await store.get('order-1');
      expect(state?.itemCount).toBe(0); // ItemAdded was not handled
    });

    test('only handles subscribed event types', async () => {
      const bus = new EventBus<OrderEvent>();

      // Only subscribe to OrderPlaced
      const unsubscribe = projector.subscribe(bus, ['OrderPlaced']);

      bus.publish(createOrderPlaced('order-1', 100));
      bus.publish(createOrderCancelled('order-1')); // Not subscribed

      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = await store.get('order-1');
      expect(state?.status).toBe('active'); // OrderCancelled was not handled

      unsubscribe();
    });
  });
});
