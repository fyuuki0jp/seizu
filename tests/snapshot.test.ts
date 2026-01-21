import { beforeEach, describe, expect, test } from 'vitest';
import { type AggregateConfig, type Command, Engine } from '../src/core/engine';
import { InMemorySnapshotStore } from '../src/core/in-memory-snapshot-store';
import { InMemoryEventStore } from '../src/core/in-memory-store';
import type { Snapshot } from '../src/core/snapshot-store';
import type { DomainEvent } from '../src/lib/events';
import { createMeta } from '../src/lib/events';
import { err, ok } from '../src/lib/result';

// Test domain: Simple counter using Plain Object events
interface CounterState {
  value: number;
}

// Plain Object event type
type Incremented = DomainEvent<'Incremented', { amount: number }>;

// Event factory function
const createIncremented = (amount: number): Incremented => ({
  type: 'Incremented',
  data: { amount },
  meta: createMeta(),
});

type CounterEvent = Incremented;

interface IncrementCommand extends Command {
  type: 'Increment';
  amount: number;
}

type CounterCommand = IncrementCommand;

class NegativeAmountError extends Error {
  constructor() {
    super('Amount must be positive');
  }
}

const counterConfig: AggregateConfig<
  CounterCommand,
  CounterEvent,
  CounterState,
  NegativeAmountError
> = {
  initialState: { value: 0 },
  reducer: (state, event) => {
    if (event.type === 'Incremented') {
      return { value: state.value + event.data.amount };
    }
    return state;
  },
  decider: (command, _state) => {
    if (command.type === 'Increment') {
      if (command.amount <= 0) {
        return err(new NegativeAmountError());
      }
      return ok([createIncremented(command.amount)]);
    }
    return ok([]);
  },
};

describe('InMemorySnapshotStore', () => {
  let snapshotStore: InMemorySnapshotStore<CounterState>;

  beforeEach(() => {
    snapshotStore = new InMemorySnapshotStore();
  });

  test('load returns undefined for new stream', async () => {
    const snapshot = await snapshotStore.load('counter-1');
    expect(snapshot).toBeUndefined();
  });

  test('save and load snapshot', async () => {
    const snapshot: Snapshot<CounterState> = {
      streamId: 'counter-1',
      version: 5,
      state: { value: 42 },
      timestamp: Date.now(),
    };

    await snapshotStore.save(snapshot);
    const loaded = await snapshotStore.load('counter-1');

    expect(loaded).toEqual(snapshot);
  });

  test('save overwrites previous snapshot', async () => {
    const snapshot1: Snapshot<CounterState> = {
      streamId: 'counter-1',
      version: 3,
      state: { value: 10 },
      timestamp: Date.now(),
    };
    const snapshot2: Snapshot<CounterState> = {
      streamId: 'counter-1',
      version: 6,
      state: { value: 25 },
      timestamp: Date.now(),
    };

    await snapshotStore.save(snapshot1);
    await snapshotStore.save(snapshot2);
    const loaded = await snapshotStore.load('counter-1');

    expect(loaded).toEqual(snapshot2);
  });

  test('clear removes all snapshots', async () => {
    const snapshot: Snapshot<CounterState> = {
      streamId: 'counter-1',
      version: 5,
      state: { value: 42 },
      timestamp: Date.now(),
    };

    await snapshotStore.save(snapshot);
    snapshotStore.clear();
    const loaded = await snapshotStore.load('counter-1');

    expect(loaded).toBeUndefined();
  });
});

describe('InMemoryEventStore with fromVersion', () => {
  let store: InMemoryEventStore<CounterEvent>;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  test('readStream returns all events when fromVersion is not specified', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);
    await store.appendToStream('counter-1', [createIncremented(2)], 1);
    await store.appendToStream('counter-1', [createIncremented(3)], 2);

    const events = await store.readStream('counter-1');
    expect(events).toHaveLength(3);
  });

  test('readStream returns events from specified version', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);
    await store.appendToStream('counter-1', [createIncremented(2)], 1);
    await store.appendToStream('counter-1', [createIncremented(3)], 2);

    const events = await store.readStream('counter-1', 2);
    expect(events).toHaveLength(1);
    expect(events[0].data.amount).toBe(3);
  });

  test('readStream with fromVersion=0 returns all events', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);
    await store.appendToStream('counter-1', [createIncremented(2)], 1);

    const events = await store.readStream('counter-1', 0);
    expect(events).toHaveLength(2);
  });

  test('readStream with fromVersion beyond length returns empty array', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);

    const events = await store.readStream('counter-1', 5);
    expect(events).toHaveLength(0);
  });
});

describe('Engine.snapshot()', () => {
  let eventStore: InMemoryEventStore<CounterEvent>;
  let snapshotStore: InMemorySnapshotStore<CounterState>;
  let engine: Engine<
    CounterCommand,
    CounterEvent,
    CounterState,
    NegativeAmountError
  >;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    snapshotStore = new InMemorySnapshotStore();
    engine = new Engine(eventStore, counterConfig, { snapshotStore });
  });

  test('snapshot saves current state', async () => {
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    await engine.snapshot('counter-1');

    const snapshot = await snapshotStore.load('counter-1');
    expect(snapshot).toBeDefined();
    expect(snapshot?.version).toBe(2);
    expect(snapshot?.state).toEqual({ value: 8 });
  });

  test('snapshot throws if no snapshotStore configured', async () => {
    const engineWithoutSnapshot = new Engine(eventStore, counterConfig);

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });

    await expect(engineWithoutSnapshot.snapshot('counter-1')).rejects.toThrow(
      'No snapshot store configured'
    );
  });
});

describe('Engine rehydration with Snapshot', () => {
  let eventStore: InMemoryEventStore<CounterEvent>;
  let snapshotStore: InMemorySnapshotStore<CounterState>;
  let engine: Engine<
    CounterCommand,
    CounterEvent,
    CounterState,
    NegativeAmountError
  >;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    snapshotStore = new InMemorySnapshotStore();
    engine = new Engine(eventStore, counterConfig, { snapshotStore });
  });

  test('rehydrates from snapshot and subsequent events', async () => {
    // Execute some commands
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    // Take a snapshot
    await engine.snapshot('counter-1');

    // Execute more commands after snapshot
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });

    // State should be correct (5 + 3 + 2 = 10)
    const state = await engine.getState('counter-1');
    expect(state.value).toBe(10);
  });

  test('uses only events after snapshot for rehydration', async () => {
    // Setup: Create 3 events
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 1,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    // Take snapshot at version 3 (state = 6)
    await engine.snapshot('counter-1');

    // Add 2 more events
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 4,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });

    // Create a new engine with the same stores to verify rehydration
    const engine2 = new Engine(eventStore, counterConfig, { snapshotStore });
    const state = await engine2.getState('counter-1');

    // Total: 1+2+3+4+5 = 15
    expect(state.value).toBe(15);
  });

  test('works without snapshot (backward compatible)', async () => {
    const engineNoSnapshot = new Engine(eventStore, counterConfig);

    await engineNoSnapshot.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });
    await engineNoSnapshot.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    const state = await engineNoSnapshot.getState('counter-1');
    expect(state.value).toBe(8);
  });
});

describe('Engine snapshotEvery (auto-snapshot)', () => {
  let eventStore: InMemoryEventStore<CounterEvent>;
  let snapshotStore: InMemorySnapshotStore<CounterState>;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    snapshotStore = new InMemorySnapshotStore();
  });

  test('auto-snapshots every N events', async () => {
    const engine = new Engine(eventStore, counterConfig, {
      snapshotStore,
      snapshotEvery: 3,
    });

    // Execute 2 commands (no snapshot yet)
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 1,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });

    let snapshot = await snapshotStore.load('counter-1');
    expect(snapshot).toBeUndefined();

    // Execute 1 more (total 3, triggers snapshot)
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    snapshot = await snapshotStore.load('counter-1');
    expect(snapshot).toBeDefined();
    expect(snapshot?.version).toBe(3);
    expect(snapshot?.state).toEqual({ value: 6 });
  });

  test('auto-snapshots again after another N events', async () => {
    const engine = new Engine(eventStore, counterConfig, {
      snapshotStore,
      snapshotEvery: 2,
    });

    // Execute 2 commands (triggers first snapshot)
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 1,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });

    let snapshot = await snapshotStore.load('counter-1');
    expect(snapshot?.version).toBe(2);

    // Execute 2 more (triggers second snapshot at version 4)
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 4,
    });

    snapshot = await snapshotStore.load('counter-1');
    expect(snapshot?.version).toBe(4);
    expect(snapshot?.state).toEqual({ value: 10 });
  });

  test('does not auto-snapshot if snapshotEvery is not set', async () => {
    const engine = new Engine(eventStore, counterConfig, {
      snapshotStore,
      // snapshotEvery not set
    });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 1,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    const snapshot = await snapshotStore.load('counter-1');
    expect(snapshot).toBeUndefined();
  });
});
