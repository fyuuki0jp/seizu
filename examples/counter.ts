/**
 * RISE - Minimal Example (Counter)
 *
 * This single-file example demonstrates Event Sourcing basics:
 * - Events: What happened (facts)
 * - Commands: What we want to do (intentions)
 * - State: Current state (derived from events)
 * - Reducer: How events change state
 * - Decider: Business logic (command -> events or error)
 *
 * Run: pnpm tsx examples/counter.ts
 */

import {
  type Command,
  createMeta,
  type DomainEvent,
  Engine,
  err,
  InMemoryEventStore,
  isOk,
  ok,
  type Result,
} from '../src';

// ============================================
// 1. Events - What happened (immutable facts)
// ============================================

type Incremented = DomainEvent<'Incremented', { amount: number }>;
type Decremented = DomainEvent<'Decremented', { amount: number }>;
type CounterEvent = Incremented | Decremented;

const incremented = (amount: number): Incremented => ({
  type: 'Incremented',
  data: { amount },
  meta: createMeta(),
});

const decremented = (amount: number): Decremented => ({
  type: 'Decremented',
  data: { amount },
  meta: createMeta(),
});

// ============================================
// 2. State - Derived from events
// ============================================

type CounterState = { count: number };

const initialState: CounterState = { count: 0 };

// ============================================
// 3. Reducer - Pure function: (state, event) -> newState
// ============================================

const reducer = (state: CounterState, event: CounterEvent): CounterState => {
  switch (event.type) {
    case 'Incremented':
      return { count: state.count + event.data.amount };
    case 'Decremented':
      return { count: state.count - event.data.amount };
  }
};

// ============================================
// 4. Commands - What we want to do
// ============================================

type Increment = Command & { type: 'Increment'; amount: number };
type Decrement = Command & { type: 'Decrement'; amount: number };
type CounterCommand = Increment | Decrement;

// ============================================
// 5. Decider - Business logic: (command, state) -> Result<events, error>
// ============================================

const decider = (
  command: CounterCommand,
  state: CounterState
): Result<CounterEvent[], Error> => {
  switch (command.type) {
    case 'Increment':
      if (command.amount <= 0) {
        return err(new Error('Amount must be positive'));
      }
      return ok([incremented(command.amount)]);

    case 'Decrement':
      if (command.amount <= 0) {
        return err(new Error('Amount must be positive'));
      }
      if (state.count - command.amount < 0) {
        return err(new Error('Counter cannot go negative'));
      }
      return ok([decremented(command.amount)]);
  }
};

// ============================================
// 6. Run the demo
// ============================================

async function main() {
  console.log('=== RISE Counter Demo ===\n');

  // Create Engine
  const engine = new Engine(new InMemoryEventStore<CounterEvent>(), {
    initialState,
    reducer,
    decider,
  });

  // Subscribe to events (optional - for logging)
  engine.on('Incremented', (e) => console.log(`  [+${e.data.amount}]`));
  engine.on('Decremented', (e) => console.log(`  [-${e.data.amount}]`));

  const counterId = 'counter-1';

  // Execute commands
  console.log('1. Increment by 5');
  await engine.execute({ type: 'Increment', streamId: counterId, amount: 5 });

  console.log('2. Increment by 3');
  await engine.execute({ type: 'Increment', streamId: counterId, amount: 3 });

  console.log('3. Decrement by 2');
  await engine.execute({ type: 'Decrement', streamId: counterId, amount: 2 });

  console.log('4. Try to decrement by 10 (should fail)');
  const result = await engine.execute({
    type: 'Decrement',
    streamId: counterId,
    amount: 10,
  });
  if (!isOk(result)) {
    console.log(`  [Error] ${result.error.message}`);
  }

  // Get final state
  const finalState = await engine.getState(counterId);
  console.log(`\nFinal count: ${finalState.count}`);
}

main().catch(console.error);
