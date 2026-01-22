import { beforeEach, describe, expect, it } from 'vitest';
import {
  type InventoryCommand,
  type InventoryError,
  type InventoryEvent,
  type InventoryState,
  inventoryAggregate,
} from '../../examples/order-flow/inventory';
import {
  type OrderCommand,
  type OrderError,
  type OrderEvent,
  type OrderState,
  orderAggregate,
} from '../../examples/order-flow/order';
import {
  type PurchaseOrderCommand,
  type PurchaseOrderError,
  type PurchaseOrderEvent,
  type PurchaseOrderState,
  purchaseOrderAggregate,
} from '../../examples/order-flow/purchase-order';
import { Engine, EventBus, InMemoryEventStore } from '../../src';

describe('Order flow example integration', () => {
  let bus: EventBus<OrderEvent | InventoryEvent | PurchaseOrderEvent>;
  let orderEngine: Engine<OrderCommand, OrderEvent, OrderState, OrderError>;
  let inventoryEngine: Engine<
    InventoryCommand,
    InventoryEvent,
    InventoryState,
    InventoryError
  >;
  let poEngine: Engine<
    PurchaseOrderCommand,
    PurchaseOrderEvent,
    PurchaseOrderState,
    PurchaseOrderError
  >;

  beforeEach(() => {
    bus = new EventBus();
    orderEngine = new Engine(new InMemoryEventStore(), orderAggregate, { bus });
    inventoryEngine = new Engine(new InMemoryEventStore(), inventoryAggregate, {
      bus,
    });
    poEngine = new Engine(new InMemoryEventStore(), purchaseOrderAggregate, {
      bus,
    });
  });

  it('should create an order', async () => {
    // Given
    const orderId = 'order-1';

    // When
    const result = await orderEngine.execute({
      type: 'PlaceOrder',
      streamId: orderId,
      productId: 'product-1',
      quantity: 3,
    });

    // Then
    expect(result.ok).toBe(true);
    const state = await orderEngine.getState(orderId);
    expect(state.status).toBe('pending');
  });

  it('should initialize and reserve inventory', async () => {
    // Given
    const productId = 'product-1';
    const streamId = `inventory-${productId}`;

    // When - Initialize
    const initResult = await inventoryEngine.execute({
      type: 'InitializeStock',
      streamId,
      quantity: 100,
    });

    // Then
    expect(initResult.ok).toBe(true);
    let state = await inventoryEngine.getState(streamId);
    expect(state.available).toBe(100);

    // When - Reserve
    const reserveResult = await inventoryEngine.execute({
      type: 'ReserveStock',
      streamId,
      quantity: 10,
      orderId: 'order-1',
    });

    // Then
    expect(reserveResult.ok).toBe(true);
    state = await inventoryEngine.getState(streamId);
    expect(state.available).toBe(90);
  });

  it('should create a purchase order', async () => {
    // Given
    const poId = 'po-1';

    // When
    const result = await poEngine.execute({
      type: 'CreatePurchaseOrder',
      streamId: poId,
      productId: 'product-1',
      quantity: 50,
    });

    // Then
    expect(result.ok).toBe(true);
    const state = await poEngine.getState(poId);
    expect(state.exists).toBe(true);
  });

  it('should trigger stock reservation when order is placed via reactor', async () => {
    // Given
    const productId = 'product-1';
    const inventoryStreamId = `inventory-${productId}`;

    // Initialize inventory
    await inventoryEngine.execute({
      type: 'InitializeStock',
      streamId: inventoryStreamId,
      quantity: 100,
    });

    // Set up reactor: OrderPlaced -> ReserveStock
    bus.on('OrderPlaced', async (event) => {
      await inventoryEngine.execute({
        type: 'ReserveStock',
        streamId: `inventory-${event.data.productId}`,
        quantity: event.data.quantity,
        orderId: event.meta?.id ?? 'unknown',
      });
    });

    // When
    await orderEngine.execute({
      type: 'PlaceOrder',
      streamId: 'order-1',
      productId,
      quantity: 10,
    });

    // Allow async event processing
    await new Promise((r) => setTimeout(r, 10));

    // Then
    const inventoryState = await inventoryEngine.getState(inventoryStreamId);
    expect(inventoryState.available).toBe(90);
  });
});
