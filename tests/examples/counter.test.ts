import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../src';
import { Engine, err, InMemoryEventStore, ok } from '../../src';

// counter.ts から型定義を再定義
type CounterState = { count: number };
type Incremented = DomainEvent<'Incremented', { amount: number }>;
type Decremented = DomainEvent<'Decremented', { amount: number }>;
type CounterEvent = Incremented | Decremented;
type IncrementCommand = { type: 'Increment'; streamId: string; amount: number };
type DecrementCommand = { type: 'Decrement'; streamId: string; amount: number };
type CounterCommand = IncrementCommand | DecrementCommand;

const reducer = (state: CounterState, event: CounterEvent): CounterState => {
  switch (event.type) {
    case 'Incremented':
      return { count: state.count + event.data.amount };
    case 'Decremented':
      return { count: state.count - event.data.amount };
  }
};

const decider = (command: CounterCommand, state: CounterState) => {
  switch (command.type) {
    case 'Increment':
      if (command.amount <= 0) {
        return err(new Error('Amount must be positive'));
      }
      return ok([
        { type: 'Incremented' as const, data: { amount: command.amount } },
      ]);
    case 'Decrement':
      if (command.amount <= 0) {
        return err(new Error('Amount must be positive'));
      }
      if (state.count - command.amount < 0) {
        return err(new Error('Counter cannot go negative'));
      }
      return ok([
        { type: 'Decremented' as const, data: { amount: command.amount } },
      ]);
  }
};

describe('Counter example integration', () => {
  let engine: Engine<CounterCommand, CounterEvent, CounterState, Error>;

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

  it('should decrement counter', async () => {
    // Given
    const streamId = 'counter-2';
    await engine.execute({ type: 'Increment', streamId, amount: 10 });

    // When
    await engine.execute({ type: 'Decrement', streamId, amount: 3 });

    // Then
    const state = await engine.getState(streamId);
    expect(state.count).toBe(7);
  });

  it('should fail to decrement below zero', async () => {
    // Given
    const streamId = 'counter-3';
    await engine.execute({ type: 'Increment', streamId, amount: 5 });

    // When
    const result = await engine.execute({
      type: 'Decrement',
      streamId,
      amount: 10,
    });

    // Then
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('negative');
    }
  });
});
