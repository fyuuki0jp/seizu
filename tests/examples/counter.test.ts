import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src';
import { Engine, InMemoryEventStore, ok } from '../../src';

// counter.ts から型定義を再定義
type CounterState = { count: number };
type Incremented = DomainEvent<'Incremented', { amount: number }>;
type CounterEvent = Incremented;
type IncrementCommand = { type: 'Increment'; streamId: string; amount: number };

const reducer = (state: CounterState, event: CounterEvent): CounterState => {
  switch (event.type) {
    case 'Incremented':
      return { count: state.count + event.data.amount };
  }
};

const decider = (command: IncrementCommand, _state: CounterState) => {
  return ok([
    { type: 'Incremented' as const, data: { amount: command.amount } },
  ]);
};

describe('Counter example integration', () => {
  let engine: Engine<IncrementCommand, CounterEvent, CounterState, Error>;

  beforeEach(() => {
    engine = new Engine(new InMemoryEventStore(), {
      initialState: { count: 0 },
      reducer,
      decider,
    });
  });

  it('should increment counter', async () => {
    // Given
    const streamId = 'counter-1';

    // When
    await engine.execute({ type: 'Increment', streamId, amount: 5 });
    await engine.execute({ type: 'Increment', streamId, amount: 3 });

    // Then
    const state = await engine.getState(streamId);
    expect(state.count).toBe(8);
  });
});
