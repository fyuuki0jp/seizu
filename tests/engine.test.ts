import { beforeEach, describe, expect, test } from 'vitest';
import {
  type AggregateConfig,
  type Command,
  Engine,
  type EventPublisher,
} from '../src/core/engine';
import { EventBus } from '../src/core/event-bus';
import { InMemoryEventStore } from '../src/core/in-memory-store';
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

describe('InMemoryEventStore', () => {
  let store: InMemoryEventStore<CounterEvent>;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  test('readStream returns empty array for new stream', async () => {
    const events = await store.readStream('counter-1');
    expect(events).toEqual([]);
  });

  test('appendToStream stores events', async () => {
    await store.appendToStream('counter-1', [createIncremented(5)], 0);
    const events = await store.readStream('counter-1');
    expect(events).toHaveLength(1);
    expect(events[0].data.amount).toBe(5);
  });

  test('appendToStream throws on version mismatch', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);

    await expect(
      store.appendToStream('counter-1', [createIncremented(2)], 0)
    ).rejects.toThrow('Concurrency conflict');
  });

  test('appendToStream succeeds with correct version', async () => {
    await store.appendToStream('counter-1', [createIncremented(1)], 0);
    await store.appendToStream('counter-1', [createIncremented(2)], 1);

    const events = await store.readStream('counter-1');
    expect(events).toHaveLength(2);
  });
});

describe('Engine', () => {
  let store: InMemoryEventStore<CounterEvent>;
  let engine: Engine<
    CounterCommand,
    CounterEvent,
    CounterState,
    NegativeAmountError
  >;

  beforeEach(() => {
    store = new InMemoryEventStore();
    engine = new Engine(store, counterConfig);
  });

  test('execute processes command and stores events', async () => {
    const result = await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].type).toBe('Incremented');
    }

    const events = await store.readStream('counter-1');
    expect(events).toHaveLength(1);
  });

  test('execute returns error from decider without storing', async () => {
    const result = await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: -1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NegativeAmountError);
    }

    const events = await store.readStream('counter-1');
    expect(events).toHaveLength(0);
  });

  test('execute rehydrates state from existing events', async () => {
    // First command
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 3,
    });

    // Second command builds on first
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 7,
    });

    const state = await engine.getState('counter-1');
    expect(state.value).toBe(10);
  });

  test('execute dispatches events for reactors', async () => {
    const received: number[] = [];

    engine.on('Incremented', (event) => {
      received.push(event.data.amount);
    });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 42,
    });

    expect(received).toEqual([42]);
  });

  test('getState returns initial state for empty stream', async () => {
    const state = await engine.getState('counter-new');
    expect(state).toEqual({ value: 0 });
  });

  test('uses custom idGenerator when provided', async () => {
    let counter = 0;
    const customIdGenerator = () => `custom-id-${++counter}`;
    const metaLessConfig: AggregateConfig<
      CounterCommand,
      CounterEvent,
      CounterState,
      NegativeAmountError
    > = {
      initialState: { value: 0 },
      reducer: counterConfig.reducer,
      decider: (command, _state) => {
        if (command.type === 'Increment') {
          if (command.amount <= 0) {
            return err(new NegativeAmountError());
          }
          return ok([
            {
              type: 'Incremented',
              data: { amount: command.amount },
            },
          ]);
        }
        return ok([]);
      },
    };
    const customEngine = new Engine(store, metaLessConfig, {
      idGenerator: customIdGenerator,
    });

    const result = await customEngine.execute({
      type: 'Increment',
      streamId: 'test-1',
      amount: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].meta?.id).toBe('custom-id-1');
    }
  });
});

describe('Engine.on (type-safe listener)', () => {
  let store: InMemoryEventStore<CounterEvent>;
  let engine: Engine<
    CounterCommand,
    CounterEvent,
    CounterState,
    NegativeAmountError
  >;

  beforeEach(() => {
    store = new InMemoryEventStore();
    engine = new Engine(store, counterConfig);
  });

  test('on receives correctly typed event', async () => {
    const received: number[] = [];
    engine.on('Incremented', (event) => {
      received.push(event.data.amount);
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 42,
    });
    expect(received).toEqual([42]);
  });

  test('on returns unsubscribe function', async () => {
    const received: number[] = [];
    const unsubscribe = engine.on('Incremented', (event) => {
      received.push(event.data.amount);
    });
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 1,
    });
    unsubscribe();
    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 2,
    });
    expect(received).toEqual([1]);
  });
});

describe('Engine with EventBus', () => {
  let store: InMemoryEventStore<CounterEvent>;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  test('publishes events to EventBus when provided', async () => {
    const bus = new EventBus<CounterEvent>();
    const received: number[] = [];

    bus.on('Incremented', (event) => {
      received.push(event.data.amount);
    });

    const engine = new Engine(store, counterConfig, { bus });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 42,
    });

    expect(received).toEqual([42]);
  });

  test('events are dispatched to both engine.on and bus.on', async () => {
    const bus = new EventBus<CounterEvent>();
    const engineReceived: number[] = [];
    const busReceived: number[] = [];

    const engine = new Engine(store, counterConfig, { bus });

    engine.on('Incremented', (event) => {
      engineReceived.push(event.data.amount);
    });

    bus.on('Incremented', (event) => {
      busReceived.push(event.data.amount);
    });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 10,
    });

    expect(engineReceived).toEqual([10]);
    expect(busReceived).toEqual([10]);
  });

  test('works without EventBus (backward compatible)', async () => {
    const engine = new Engine(store, counterConfig); // no bus
    const received: number[] = [];

    engine.on('Incremented', (event) => {
      received.push(event.data.amount);
    });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });

    expect(received).toEqual([5]);
  });

  test('onPublishError is called when async publish rejects', async () => {
    const errors: unknown[] = [];
    const asyncBus: EventPublisher = {
      publish: async () => {
        throw new Error('Publish failed');
      },
    };
    const engine = new Engine(store, counterConfig, {
      bus: asyncBus,
      onPublishError: (err, _event) => errors.push(err),
    });

    const result = await engine.execute({
      type: 'Increment',
      streamId: 'test-1',
      amount: 5,
    });

    expect(result.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('Publish failed');
  });
});
