/**
 * RISE - Projection Demo
 *
 * This example demonstrates the Projection feature:
 * - Building read models from events
 * - Multiple projections on the same event stream
 * - Projector's handle() and rebuild() methods
 * - EventBus integration
 *
 * Run: pnpm tsx examples/projection-demo.ts
 */

import {
  type Command,
  createMeta,
  type DomainEvent,
  defineProjection,
  Engine,
  EventBus,
  InMemoryEventStore,
  InMemoryProjectionStore,
  ok,
  Projector,
  type Result,
} from '../src';

// ============================================
// 1. Events - Order lifecycle
// ============================================

type OrderPlaced = DomainEvent<
  'OrderPlaced',
  { orderId: string; amount: number }
>;
type OrderConfirmed = DomainEvent<'OrderConfirmed', { orderId: string }>;
type OrderCancelled = DomainEvent<'OrderCancelled', { orderId: string }>;
type OrderEvent = OrderPlaced | OrderConfirmed | OrderCancelled;

const orderPlaced = (orderId: string, amount: number): OrderPlaced => ({
  type: 'OrderPlaced',
  data: { orderId, amount },
  meta: createMeta(),
});

const orderConfirmed = (orderId: string): OrderConfirmed => ({
  type: 'OrderConfirmed',
  data: { orderId },
  meta: createMeta(),
});

const orderCancelled = (orderId: string): OrderCancelled => ({
  type: 'OrderCancelled',
  data: { orderId },
  meta: createMeta(),
});

// ============================================
// 2. State (for Engine - simplified)
// ============================================

type OrderState = {
  orderId: string | null;
  amount: number;
  status: 'none' | 'placed' | 'confirmed' | 'cancelled';
};

const initialState: OrderState = {
  orderId: null,
  amount: 0,
  status: 'none',
};

const reducer = (state: OrderState, event: OrderEvent): OrderState => {
  switch (event.type) {
    case 'OrderPlaced':
      return {
        orderId: event.data.orderId,
        amount: event.data.amount,
        status: 'placed',
      };
    case 'OrderConfirmed':
      return { ...state, status: 'confirmed' };
    case 'OrderCancelled':
      return { ...state, status: 'cancelled' };
  }
};

// ============================================
// 3. Commands
// ============================================

type PlaceOrder = Command & {
  type: 'PlaceOrder';
  orderId: string;
  amount: number;
};
type ConfirmOrder = Command & { type: 'ConfirmOrder' };
type CancelOrder = Command & { type: 'CancelOrder' };
type OrderCommand = PlaceOrder | ConfirmOrder | CancelOrder;

const decider = (
  command: OrderCommand,
  state: OrderState
): Result<OrderEvent[], Error> => {
  switch (command.type) {
    case 'PlaceOrder':
      return ok([orderPlaced(command.orderId, command.amount)]);
    case 'ConfirmOrder':
      return ok([orderConfirmed(state.orderId!)]);
    case 'CancelOrder':
      return ok([orderCancelled(state.orderId!)]);
  }
};

// ============================================
// 4. Projections
// ============================================

// Projection 1: Order Summary (per order)
type OrderSummaryState = {
  orderId: string;
  amount: number;
  status: 'placed' | 'confirmed' | 'cancelled';
};

const orderSummaryProjection = defineProjection<OrderSummaryState, OrderEvent>(
  'OrderSummary',
  () => ({ orderId: '', amount: 0, status: 'placed' }),
  (state, event) => {
    switch (event.type) {
      case 'OrderPlaced':
        return {
          orderId: event.data.orderId,
          amount: event.data.amount,
          status: 'placed',
        };
      case 'OrderConfirmed':
        return { ...state, status: 'confirmed' };
      case 'OrderCancelled':
        return { ...state, status: 'cancelled' };
    }
  }
);

// Projection 2: Statistics (global aggregation)
type StatisticsState = {
  totalOrders: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
};

const statisticsProjection = defineProjection<StatisticsState, OrderEvent>(
  'Statistics',
  () => ({ totalOrders: 0, confirmed: 0, cancelled: 0, revenue: 0 }),
  (state, event) => {
    switch (event.type) {
      case 'OrderPlaced':
        return {
          ...state,
          totalOrders: state.totalOrders + 1,
          // Revenue is added when order is placed, but adjusted on cancel
        };
      case 'OrderConfirmed':
        return { ...state, confirmed: state.confirmed + 1 };
      case 'OrderCancelled':
        return { ...state, cancelled: state.cancelled + 1 };
    }
  }
);

// ============================================
// 5. Demo
// ============================================

async function main() {
  console.log('=== RISE Projection Demo ===\n');

  // Setup EventBus and Engine
  const bus = new EventBus<OrderEvent>();
  const eventStore = new InMemoryEventStore<OrderEvent>();

  const engine = new Engine(
    eventStore,
    {
      initialState,
      reducer,
      decider,
    },
    { bus }
  );

  // Setup Projections with Projector
  const orderSummaryStore = new InMemoryProjectionStore<OrderSummaryState>();
  const orderSummaryProjector = new Projector(
    orderSummaryProjection,
    orderSummaryStore,
    (event) => event.data.orderId
  );

  const statisticsStore = new InMemoryProjectionStore<StatisticsState>();
  const statisticsProjector = new Projector(
    statisticsProjection,
    statisticsStore,
    () => 'global' // Single aggregation
  );

  // Track order amounts for revenue calculation in statistics
  const orderAmounts = new Map<string, number>();

  // Subscribe projectors to EventBus
  orderSummaryProjector.subscribe(bus, [
    'OrderPlaced',
    'OrderConfirmed',
    'OrderCancelled',
  ]);

  // For statistics, we need custom handling to track revenue
  bus.on('OrderPlaced', async (event) => {
    orderAmounts.set(event.data.orderId, event.data.amount);
    await statisticsProjector.handle(event);
  });
  bus.on('OrderConfirmed', async (event) => {
    // Add revenue when confirmed
    const current =
      (await statisticsStore.get('global')) ?? statisticsProjection.init();
    const amount = orderAmounts.get(event.data.orderId) ?? 0;
    await statisticsStore.set('global', {
      ...current,
      confirmed: current.confirmed + 1,
      revenue: current.revenue + amount,
    });
  });
  bus.on('OrderCancelled', async (event) => {
    await statisticsProjector.handle(event);
  });

  // --- Part 1: Process order events ---

  console.log('1. Processing order events...');

  await engine.execute({
    type: 'PlaceOrder',
    streamId: 'order-1',
    orderId: 'order-1',
    amount: 100,
  });
  console.log('   OrderPlaced: order-1 ($100)');

  await engine.execute({
    type: 'PlaceOrder',
    streamId: 'order-2',
    orderId: 'order-2',
    amount: 200,
  });
  console.log('   OrderPlaced: order-2 ($200)');

  await engine.execute({ type: 'ConfirmOrder', streamId: 'order-1' });
  console.log('   OrderConfirmed: order-1');

  await engine.execute({ type: 'CancelOrder', streamId: 'order-2' });
  console.log('   OrderCancelled: order-2');

  // Wait a bit for async projectors to complete
  await new Promise((resolve) => setTimeout(resolve, 10));

  // --- Part 2: Query Order Summary Projection ---

  console.log('\n2. Order Summary Projection:');
  const allOrders = await orderSummaryStore.getAll();
  for (const [orderId, summary] of allOrders) {
    console.log(`   ${orderId}: ${summary.status}, $${summary.amount}`);
  }

  // --- Part 3: Query Statistics Projection ---

  console.log('\n3. Statistics Projection:');
  const stats =
    (await statisticsStore.get('global')) ?? statisticsProjection.init();
  console.log(`   Total orders: ${stats.totalOrders}`);
  console.log(`   Confirmed: ${stats.confirmed}`);
  console.log(`   Cancelled: ${stats.cancelled}`);
  console.log(`   Revenue: $${stats.revenue}`);

  // --- Part 4: Rebuild projections ---

  console.log('\n4. Rebuilding projections from scratch...');

  // Clear and rebuild Order Summary
  const rebuildStore = new InMemoryProjectionStore<OrderSummaryState>();
  const rebuildProjector = new Projector(
    orderSummaryProjection,
    rebuildStore,
    (event) => event.data.orderId
  );

  // Collect all events from all streams
  const allEvents: OrderEvent[] = [];
  const order1Events = await eventStore.readStream('order-1');
  const order2Events = await eventStore.readStream('order-2');
  allEvents.push(...order1Events, ...order2Events);

  // Rebuild
  await rebuildProjector.rebuild(allEvents);

  // Verify rebuild results
  const rebuiltOrders = await rebuildStore.getAll();
  console.log('   (Same results after rebuild)');
  for (const [orderId, summary] of rebuiltOrders) {
    console.log(`   ${orderId}: ${summary.status}, $${summary.amount}`);
  }

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
