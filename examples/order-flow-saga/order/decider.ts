import { err, ok, type Result } from '../../../src';
import type { OrderCommand } from './commands';
import {
  OrderAlreadyCancelledError,
  OrderAlreadyConfirmedError,
  OrderAlreadyExistsError,
  type OrderError,
  OrderNotFoundError,
} from './errors';
import {
  createOrderCancelled,
  createOrderConfirmed,
  createOrderPlaced,
  type OrderEvent,
} from './events';
import type { OrderState } from './state';

export const decider = (
  command: OrderCommand,
  state: OrderState
): Result<OrderEvent[], OrderError> => {
  switch (command.type) {
    case 'PlaceOrder': {
      if (state.exists) {
        return err(new OrderAlreadyExistsError(command.streamId));
      }
      return ok([
        createOrderPlaced(
          command.streamId,
          command.productId,
          command.quantity
        ),
      ]);
    }
    case 'ConfirmOrder': {
      if (!state.exists) {
        return err(new OrderNotFoundError(command.streamId));
      }
      if (state.status === 'confirmed') {
        return err(new OrderAlreadyConfirmedError(command.streamId));
      }
      if (state.status === 'cancelled') {
        return err(new OrderAlreadyCancelledError(command.streamId));
      }
      return ok([createOrderConfirmed(command.streamId)]);
    }
    case 'CancelOrder': {
      if (!state.exists) {
        return err(new OrderNotFoundError(command.streamId));
      }
      if (state.status === 'cancelled') {
        return err(new OrderAlreadyCancelledError(command.streamId));
      }
      if (state.status === 'confirmed') {
        return err(new OrderAlreadyConfirmedError(command.streamId));
      }
      return ok([createOrderCancelled(command.streamId, command.reason)]);
    }
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
};
