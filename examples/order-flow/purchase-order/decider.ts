import type { Result } from '../../../src';
import { ok, err } from '../../../src';
import type { PurchaseOrderCommand } from './commands';
import type { PurchaseOrderEvent } from './events';
import { createPurchaseOrderCreated } from './events';
import type { PurchaseOrderState } from './state';
import { PurchaseOrderAlreadyExistsError, type PurchaseOrderError } from './errors';

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
        createPurchaseOrderCreated(command.streamId, command.productId, command.quantity)
      ]);
    }
    default:
      return ok([]);
  }
};
