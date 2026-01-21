import { err, ok, type Result } from '../../src';
import type { CartCommand } from './commands';
import {
  CartAlreadyExistsError,
  type CartError,
  CartNotFoundError,
  InvalidQuantityError,
  ItemNotInCartError,
} from './errors';
import {
  type CartEvent,
  createCartCreated,
  createItemAdded,
  createItemRemoved,
} from './events';
import type { CartState } from './state';

// Decider - pure function, business logic lives here
export const decider = (
  command: CartCommand,
  state: CartState
): Result<CartEvent[], CartError> => {
  switch (command.type) {
    case 'CreateCart': {
      if (state.exists) {
        return err(new CartAlreadyExistsError(command.streamId));
      }
      return ok([createCartCreated(command.streamId, command.userId)]);
    }

    case 'AddItem': {
      if (!state.exists) {
        return err(new CartNotFoundError(command.streamId));
      }
      if (command.quantity <= 0) {
        return err(new InvalidQuantityError(command.quantity));
      }
      return ok([
        createItemAdded(command.itemId, command.quantity, command.price),
      ]);
    }

    case 'RemoveItem': {
      if (!state.exists) {
        return err(new CartNotFoundError(command.streamId));
      }
      if (!state.items.has(command.itemId)) {
        return err(new ItemNotInCartError(command.itemId));
      }
      return ok([createItemRemoved(command.itemId)]);
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
};
