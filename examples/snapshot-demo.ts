/**
 * RISE - Snapshot Demo
 *
 * This example demonstrates the Snapshot feature:
 * - Manual snapshot creation
 * - State rehydration from snapshot
 * - Automatic snapshot with snapshotEvery option
 *
 * Run: pnpm tsx examples/snapshot-demo.ts
 */

import {
  Engine,
  InMemoryEventStore,
  InMemorySnapshotStore,
  ok,
  err,
  createMeta,
  type DomainEvent,
  type Result,
  type Command,
} from '../src';

// ============================================
// 1. Events - What happened
// ============================================

type Incremented = DomainEvent<'Incremented', { amount: number }>;
type CounterEvent = Incremented;

const incremented = (amount: number): Incremented => ({
  type: 'Incremented',
  data: { amount },
  meta: createMeta(),
});

// ============================================
// 2. State
// ============================================

type CounterState = { count: number };

const initialState: CounterState = { count: 0 };

// ============================================
// 3. Reducer
// ============================================

const reducer = (state: CounterState, event: CounterEvent): CounterState => {
  switch (event.type) {
    case 'Incremented':
      return { count: state.count + event.data.amount };
  }
};

// ============================================
// 4. Commands
// ============================================

type Increment = Command & { type: 'Increment'; amount: number };
type CounterCommand = Increment;

// ============================================
// 5. Decider
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
  }
};

// ============================================
// 6. Demo
// ============================================

async function main() {
  console.log('=== RISE Snapshot Demo ===\n');

  // Shared stores for persistence simulation
  const eventStore = new InMemoryEventStore<CounterEvent>();
  const snapshotStore = new InMemorySnapshotStore<CounterState>();

  const counterId = 'counter-1';

  // --- Part 1: Manual Snapshot ---

  console.log('1. Adding 100 increment events...');
  const engine1 = new Engine(eventStore, {
    initialState,
    reducer,
    decider,
  }, {
    snapshotStore,
  });

  for (let i = 0; i < 100; i++) {
    await engine1.execute({ type: 'Increment', streamId: counterId, amount: 1 });
  }
  const state1 = await engine1.getState(counterId);
  console.log(`   Done. Current count: ${state1.count}`);

  console.log('\n2. Taking manual snapshot...');
  await engine1.snapshot(counterId);
  const snapshot = await snapshotStore.load(counterId);
  console.log(`   Snapshot saved at version ${snapshot?.version}`);

  console.log('\n3. Adding 10 more events...');
  for (let i = 0; i < 10; i++) {
    await engine1.execute({ type: 'Increment', streamId: counterId, amount: 1 });
  }
  const state2 = await engine1.getState(counterId);
  console.log(`   Done. Current count: ${state2.count}`);

  // --- Part 2: Simulating restart with snapshot rehydration ---

  console.log('\n4. Simulating restart (new Engine instance)...');
  // Create a new engine instance (simulates application restart)
  const engine2 = new Engine(eventStore, {
    initialState,
    reducer,
    decider,
  }, {
    snapshotStore,
  });

  // getState will automatically use snapshot + replay events since snapshot
  const restoredState = await engine2.getState(counterId);
  console.log(`   Loaded from snapshot (version ${snapshot?.version}) + 10 events`);
  console.log(`   State restored: count = ${restoredState.count}`);

  // --- Part 3: snapshotEvery option ---

  console.log('\n5. Testing snapshotEvery option...');
  console.log('   (snapshotEvery: 5)');

  const eventStore2 = new InMemoryEventStore<CounterEvent>();
  const snapshotStore2 = new InMemorySnapshotStore<CounterState>();
  const counter2Id = 'counter-2';

  const engine3 = new Engine(eventStore2, {
    initialState,
    reducer,
    decider,
  }, {
    snapshotStore: snapshotStore2,
    snapshotEvery: 5,
  });

  // Track snapshots taken
  const snapshotVersions: number[] = [];

  for (let i = 0; i < 12; i++) {
    await engine3.execute({ type: 'Increment', streamId: counter2Id, amount: 1 });

    // Check if a new snapshot was taken
    const snap = await snapshotStore2.load(counter2Id);
    if (snap && !snapshotVersions.includes(snap.version)) {
      snapshotVersions.push(snap.version);
    }
  }

  console.log(`   After 12 events, snapshots taken at: ${snapshotVersions.join(', ')}`);

  const finalState = await engine3.getState(counter2Id);
  console.log(`   Final count: ${finalState.count}`);

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
