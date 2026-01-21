import type { Result } from '../../../src';
import { err, ok } from '../../../src';
import type { PurchaseOrderCommand } from './commands';
import {
  PurchaseOrderAlreadyExistsError,
  type PurchaseOrderError,
} from './errors';
import type { PurchaseOrderEvent } from './events';
import { createPurchaseOrderCreated } from './events';
import type { PurchaseOrderState } from './state';

export const decider = (
  command: PurchaseOrderCommand,
  state: PurchaseOrderState
): Result<PurchaseOrderEvent[], PurchaseOrderError> => {
  switch (command.type) {
    case 'CreatePurchaseOrder': {
      if (state.exists) {
        return err(new PurchaseOrderAlreadyExistsError(command.streamId));
      }
      return ok([
        createPurchaseOrderCreated(
          command.streamId,
          command.productId,
          command.quantity
        ),
      ]);
    }
    default:
      return ok([]);
  }
};
