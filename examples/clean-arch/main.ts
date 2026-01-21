import { createCartEngine } from './infrastructure/setup';
import { AddItemUseCase, CreateCartUseCase } from './use-cases';

const main = async () => {
  console.log('=== Clean Architecture Example ===\n');

  const engine = createCartEngine();
  const createCart = new CreateCartUseCase(engine);
  const addItem = new AddItemUseCase(engine);

  // Use Case 経由で操作
  console.log('1. Creating cart...');
  const createResult = await createCart.execute('cart-1');
  if (createResult.ok) {
    console.log('✓ Cart created:', createResult.value[0]);
  } else {
    console.error('✗ Failed to create cart:', createResult.error);
    return;
  }

  console.log('\n2. Adding item...');
  const addResult = await addItem.execute('cart-1', 'item-1', 2, 10.0);
  if (addResult.ok) {
    console.log('✓ Item added:', addResult.value[0]);
  } else {
    console.error('✗ Failed to add item:', addResult.error);
  }

  console.log('\n=== Done ===');
};

main();
