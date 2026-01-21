import type { AggregateConfig } from '../../../src';
import { initialState, reducer } from './state';
import { decider } from './decider';
import type { PurchaseOrderCommand } from './commands';
import type { PurchaseOrderEvent } from './events';
import type { PurchaseOrderState } from './state';
import type { PurchaseOrderError } from './errors';

export const purchaseOrderAggregate: AggregateConfig<PurchaseOrderCommand, PurchaseOrderEvent, PurchaseOrderState, PurchaseOrderError> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { PurchaseOrderCommand, PurchaseOrderEvent, PurchaseOrderState, PurchaseOrderError };

// Re-export command factories
export { createPurchaseOrder } from './commands';

// Re-export event types and factories
export type { PurchaseOrderCreated } from './events';
export { createPurchaseOrderCreated } from './events';
