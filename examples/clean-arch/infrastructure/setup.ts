import { Engine, InMemoryEventStore } from '../../../src';
import type {
  CartCommand,
  CartError,
  CartEvent,
  CartState,
} from '../domain/cart';
import { decider } from '../domain/cart/decider';
import { initialState, reducer } from '../domain/cart/state';

export const createCartEngine = (): Engine<
  CartCommand,
  CartEvent,
  CartState,
  CartError
> => {
  const store = new InMemoryEventStore<CartEvent>();
  return new Engine(store, {
    decider,
    reducer,
    initialState,
  });
};
