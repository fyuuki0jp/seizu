import { describe, expect, test } from 'vitest';
import {
  type Command,
  createMeta,
  type DomainEvent,
  Engine,
  err,
  InMemoryEventStore,
  ok,
  type Result,
} from '../src';

// Test domain using Plain Object events
type Incremented = DomainEvent<'Incremented', { amount: number }>;

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

interface CounterState {
  value: number;
}

class NegativeAmountError extends Error {
  constructor() {
    super('Amount must be positive');
  }
}

// Config を分離して定義（型パラメータなしで推論されるか確認）
const config = {
  initialState: { value: 0 } as CounterState,
  reducer: (state: CounterState, event: CounterEvent): CounterState => {
    return { value: state.value + event.data.amount };
  },
  decider: (
    command: CounterCommand,
    _state: CounterState
  ): Result<CounterEvent[], NegativeAmountError> => {
    if (command.amount <= 0) {
      return err(new NegativeAmountError());
    }
    return ok([createIncremented(command.amount)]);
  },
};

describe('Engine type inference', () => {
  test('Engine infers types from config without explicit type parameters', async () => {
    // 型パラメータなしで Engine を作成
    const store = new InMemoryEventStore<CounterEvent>();
    const engine = new Engine(store, config);

    // execute の引数型が正しく推論される
    const result = await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 5,
    });

    // 戻り値型が正しく推論される
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].data.amount).toBe(5);
    }

    // getState の戻り値型が正しく推論される
    const state = await engine.getState('counter-1');
    expect(state.value).toBe(5);

    // on メソッドの型が正しく推論される
    const received: number[] = [];
    engine.on('Incremented', (event) => {
      // event.data.amount は number 型として推論される
      received.push(event.data.amount);
    });

    await engine.execute({
      type: 'Increment',
      streamId: 'counter-1',
      amount: 10,
    });

    expect(received).toEqual([10]);
  });

  test('Engine type inference works with inline config', async () => {
    const store = new InMemoryEventStore<CounterEvent>();

    // インラインで config を渡しても型推論が効く
    const engine = new Engine(store, {
      initialState: { value: 0 } as CounterState,
      reducer: (state: CounterState, event: CounterEvent): CounterState => {
        return { value: state.value + event.data.amount };
      },
      decider: (
        command: CounterCommand,
        _state: CounterState
      ): Result<CounterEvent[], NegativeAmountError> => {
        if (command.amount <= 0) {
          return err(new NegativeAmountError());
        }
        return ok([createIncremented(command.amount)]);
      },
    });

    const result = await engine.execute({
      type: 'Increment',
      streamId: 'counter-2',
      amount: 42,
    });

    expect(result.ok).toBe(true);
  });

  test('Engine error type is correctly inferred', async () => {
    const store = new InMemoryEventStore<CounterEvent>();
    const engine = new Engine(store, config);

    // エラーケースで error の型が正しく推論される
    const result = await engine.execute({
      type: 'Increment',
      streamId: 'counter-3',
      amount: -1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NegativeAmountError);
      expect(result.error.message).toBe('Amount must be positive');
    }
  });
});
