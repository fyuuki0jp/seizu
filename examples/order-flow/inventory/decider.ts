import type { Result } from '../../../src';
import { err, ok } from '../../../src';
import type { InventoryCommand } from './commands';
import {
  InsufficientStockError,
  InventoryAlreadyInitializedError,
  type InventoryError,
  InventoryNotInitializedError,
} from './errors';
import type { InventoryEvent } from './events';
import {
  createStockDepleted,
  createStockInitialized,
  createStockReleased,
  createStockReserved,
} from './events';
import type { InventoryState } from './state';

const LOW_STOCK_THRESHOLD = 5;

export const decider = (
  command: InventoryCommand,
  state: InventoryState
): Result<InventoryEvent[], InventoryError> => {
  switch (command.type) {
    case 'InitializeStock': {
      if (state.initialized) {
        const productId = command.streamId.replace('inventory-', '');
        return err(new InventoryAlreadyInitializedError(productId));
      }
      const productId = command.streamId.replace('inventory-', '');
      return ok([createStockInitialized(productId, command.quantity)]);
    }
    case 'ReserveStock': {
      const productId = command.streamId.replace('inventory-', '');
      if (!state.initialized) {
        return err(new InventoryNotInitializedError(productId));
      }
      if (state.available < command.quantity) {
        return err(
          new InsufficientStockError(
            productId,
            command.quantity,
            state.available
          )
        );
      }

      const events: InventoryEvent[] = [
        createStockReserved(productId, command.quantity, command.orderId),
      ];

      // 在庫が閾値を下回ったら StockDepleted を発行
      const newAvailable = state.available - command.quantity;
      if (newAvailable <= LOW_STOCK_THRESHOLD) {
        events.push(createStockDepleted(productId, newAvailable));
      }

      return ok(events);
    }
    case 'ReleaseStock': {
      const productId = command.streamId.replace('inventory-', '');
      if (!state.initialized) {
        return err(new InventoryNotInitializedError(productId));
      }
      return ok([
        createStockReleased(productId, command.quantity, command.orderId),
      ]);
    }
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
};
