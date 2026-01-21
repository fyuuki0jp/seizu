import { Engine, InMemoryEventStore, isOk } from '../../src';
import { addItem, createCart, removeItem } from './commands';
import { decider } from './decider';
import type { CartEvent } from './events';
import { initialState, reducer } from './state';

// Create the engine with our domain configuration
// 型パラメータを明示的に指定しなくても、config から型が推論される
const store = new InMemoryEventStore<CartEvent>();
const engine = new Engine(store, {
  initialState,
  reducer,
  decider,
});

// Optional: Set up reactors (side effects)
engine.on('CartCreated', (event) => {
  console.log(`✅ Cart created for user: ${event.data.userId}`);
});

engine.on('ItemAdded', (event) => {
  const { itemId, quantity, price } = event.data;
  console.log(`  📦 Added ${quantity}x ${itemId} @ $${price}`);
});

engine.on('ItemRemoved', (event) => {
  console.log(`  🗑️  Removed item: ${event.data.itemId}`);
});

// Demo: Execute commands
async function main() {
  console.log('=== RISE Cart Demo ===\n');

  const cartId = 'cart-001';

  // 1. Create a cart
  const createResult = await engine.execute(createCart(cartId, 'user-alice'));
  if (!isOk(createResult)) {
    console.error('Failed to create cart:', createResult.error.message);
    return;
  }

  // 2. Add some items
  await engine.execute(addItem(cartId, 'apple', 3, 1.5));
  await engine.execute(addItem(cartId, 'banana', 2, 0.75));
  await engine.execute(addItem(cartId, 'apple', 2, 1.5)); // Add more apples

  // 3. Remove an item
  await engine.execute(removeItem(cartId, 'banana'));

  // 4. Try to remove non-existent item (should fail gracefully)
  const removeResult = await engine.execute(removeItem(cartId, 'orange'));
  if (!isOk(removeResult)) {
    console.log(`\n⚠️  Expected error: ${removeResult.error.message}`);
  }

  // 5. Show final state
  const finalState = await engine.getState(cartId);
  console.log('\n=== Final Cart State ===');
  console.log('Items:');
  for (const [id, item] of finalState.items) {
    console.log(
      `  - ${id}: ${item.quantity} x $${item.price} = $${item.quantity * item.price}`
    );
  }

  const total = Array.from(finalState.items.values()).reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  console.log(`\nTotal: $${total.toFixed(2)}`);
}

main().catch(console.error);
