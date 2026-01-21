import { Engine, EventBus, InMemoryEventStore, isOk } from '../../src';
import {
  type InventoryEvent,
  initializeStock,
  inventoryAggregate,
  reserveStock,
} from './inventory';
// ===== 1. Aggregate Imports (簡素化されたインポート) =====
import {
  confirmOrder,
  type OrderEvent,
  orderAggregate,
  placeOrder,
} from './order';
import {
  createPurchaseOrder,
  type PurchaseOrderEvent,
  purchaseOrderAggregate,
} from './purchase-order';

type AllEvents = OrderEvent | InventoryEvent | PurchaseOrderEvent;

// ===== 2. Shared EventBus =====
const bus = new EventBus<AllEvents>({
  onError: (error, event) => {
    console.error(`❌ Reactor error on ${event.type}:`, error);
  },
});

// ===== 3. Engines (all connected to shared bus) =====
const orderEngine = new Engine(
  new InMemoryEventStore<OrderEvent>(),
  orderAggregate,
  { bus }
);

const inventoryEngine = new Engine(
  new InMemoryEventStore<InventoryEvent>(),
  inventoryAggregate,
  { bus }
);

const poEngine = new Engine(
  new InMemoryEventStore<PurchaseOrderEvent>(),
  purchaseOrderAggregate,
  { bus }
);

// ===== 4. Reactors (全て bus に登録 - イベントフローが一箇所で見える) =====

// OrderPlaced → 在庫を予約
bus.on('OrderPlaced', async (event) => {
  console.log(`  📦 Order placed: ${event.data.orderId}`);

  const result = await inventoryEngine.execute(
    reserveStock(event.data.productId, event.data.quantity, event.data.orderId)
  );

  if (!isOk(result)) {
    console.log(`  ❌ Stock reservation failed: ${result.error.message}`);
  }
});

// StockReserved → 注文を確定
bus.on('StockReserved', async (event) => {
  console.log(
    `  ✅ Stock reserved: ${event.data.quantity}x ${event.data.productId}`
  );

  await orderEngine.execute(confirmOrder(event.data.orderId));
  console.log(`  🎉 Order confirmed: ${event.data.orderId}`);
});

// StockDepleted → 自動発注
bus.on('StockDepleted', async (event) => {
  console.log(
    `  ⚠️  Low stock alert: ${event.data.productId} (${event.data.remainingStock} left)`
  );

  const poId = `po-${event.data.productId}-${Date.now()}`;
  await poEngine.execute(createPurchaseOrder(poId, event.data.productId, 100));
  console.log(`  📋 Auto-reorder created: ${poId}`);
});

// PurchaseOrderCreated → 通知
bus.on('PurchaseOrderCreated', (event) => {
  console.log(`  📬 Supplier notified: ${event.data.purchaseOrderId}`);
});

// ===== 5. Demo =====
async function main() {
  console.log('=== RISE Order Flow Demo (EventBus) ===\n');

  // Setup
  console.log('📦 Initializing inventory...');
  await inventoryEngine.execute(initializeStock('apple', 10));
  console.log('  ✅ apple: 10 units\n');

  // Order 1
  console.log('--- Order 1: 3 apples ---');
  await orderEngine.execute(placeOrder('order-001', 'apple', 3));
  await sleep(50);
  console.log('');

  // Order 2 (triggers low stock)
  console.log('--- Order 2: 4 apples ---');
  await orderEngine.execute(placeOrder('order-002', 'apple', 4));
  await sleep(50);
  console.log('');

  // Order 3 (fails - insufficient stock)
  console.log('--- Order 3: 5 apples ---');
  await orderEngine.execute(placeOrder('order-003', 'apple', 5));
  await sleep(50);
  console.log('');

  // Final state
  console.log('=== Final States ===');
  const inv = await inventoryEngine.getState('inventory-apple');
  console.log(
    `Inventory: ${inv.available} available, ${inv.reserved} reserved`
  );

  for (const id of ['order-001', 'order-002', 'order-003']) {
    const state = await orderEngine.getState(id);
    console.log(`${id}: ${state.status}`);
  }

  console.log('\n✨ Done!');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

main().catch(console.error);
