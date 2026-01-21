import { Engine, EventBus, InMemoryEventStore, isOk } from '../../src';
import {
  type InventoryEvent,
  initializeStock,
  inventoryAggregate,
  releaseStock,
  reserveStock,
} from './inventory';
import {
  cancelOrder,
  confirmOrder,
  type OrderEvent,
  orderAggregate,
  placeOrder,
} from './order';
import { type PaymentEvent, paymentAggregate, processPayment } from './payment';

type AllEvents = OrderEvent | InventoryEvent | PaymentEvent;

const bus = new EventBus<AllEvents>({
  onError: (error, event) =>
    console.error(`❌ Reactor error on ${event.type}:`, error),
});

// Engines
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
const paymentEngine = new Engine(
  new InMemoryEventStore<PaymentEvent>(),
  paymentAggregate,
  { bus }
);

// ===== Reactors: 正常フロー =====

bus.on('OrderPlaced', async (e) => {
  console.log(`  📦 Order placed: ${e.data.orderId}`);
  const result = await inventoryEngine.execute(
    reserveStock(e.data.productId, e.data.quantity, e.data.orderId)
  );
  if (!isOk(result)) {
    console.log(`  ❌ Stock reservation failed: ${result.error.message}`);
  }
});

bus.on('StockReserved', async (e) => {
  console.log(`  ✅ Stock reserved: ${e.data.quantity}x ${e.data.productId}`);
  console.log(`  💳 Processing payment...`);
  await paymentEngine.execute(
    processPayment(e.data.orderId, e.data.quantity * 100)
  ); // 仮の金額
});

bus.on('PaymentProcessed', async (e) => {
  console.log(`  ✅ Payment processed: $${e.data.amount / 100}`);
  await orderEngine.execute(confirmOrder(e.data.orderId));
  console.log(`  🎉 Order confirmed: ${e.data.orderId}`);
});

// ===== Reactors: 補償フロー =====

bus.on('PaymentFailed', async (e) => {
  console.log(`  ❌ Payment failed: ${e.data.reason}`);
  console.log(`  ↩️  Releasing stock (compensation)...`);

  // 在庫情報を取得するため、orderId から productId と quantity を復元
  const orderState = await orderEngine.getState(e.data.orderId);
  if (orderState.productId) {
    await inventoryEngine.execute(
      releaseStock(orderState.productId, orderState.quantity, e.data.orderId)
    );
  }
});

bus.on('StockReleased', async (e) => {
  console.log(`  ✅ Stock released: ${e.data.quantity}x ${e.data.productId}`);
  await orderEngine.execute(cancelOrder(e.data.orderId, 'Payment failed'));
});

bus.on('OrderCancelled', (e) => {
  console.log(`  🚫 Order cancelled: ${e.data.orderId} (${e.data.reason})`);
});

bus.on('OrderConfirmed', () => {
  // OrderConfirmed は PaymentProcessed ハンドラ内でログ出力済み
});

// ===== Demo =====

async function main() {
  console.log('=== Order Flow with Saga/Compensation Pattern ===\n');

  console.log('📦 Initializing inventory...');
  await inventoryEngine.execute(initializeStock('apple', 10));
  console.log('  ✅ apple: 10 units\n');

  // Order 1: 成功フロー
  console.log('--- Order 1: 3 apples (success) ---');
  await orderEngine.execute(placeOrder('order-001', 'apple', 3));
  await sleep(100);
  console.log('');

  // Order 2: 決済失敗（補償発動）
  console.log('--- Order 2: 4 apples (payment will fail) ---');
  await orderEngine.execute(placeOrder('fail-002', 'apple', 4));
  await sleep(100);
  console.log('');

  // Order 3: 成功フロー
  console.log('--- Order 3: 2 apples (success) ---');
  await orderEngine.execute(placeOrder('order-003', 'apple', 2));
  await sleep(100);
  console.log('');

  // 最終状態
  console.log('=== Final States ===');
  const inv = await inventoryEngine.getState('inventory-apple');
  console.log(
    `Inventory: ${inv.available} available, ${inv.reserved} reserved`
  );

  for (const id of ['order-001', 'fail-002', 'order-003']) {
    const state = await orderEngine.getState(id);
    console.log(`${id}: ${state.status}`);
  }

  console.log('\n✨ Done!');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
main().catch(console.error);
