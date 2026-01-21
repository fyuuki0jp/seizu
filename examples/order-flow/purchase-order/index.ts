import type { AggregateConfig } from '../../../src';
import type { PurchaseOrderCommand } from './commands';
import { decider } from './decider';
import type { PurchaseOrderError } from './errors';
import type { PurchaseOrderEvent } from './events';
import type { PurchaseOrderState } from './state';
import { initialState, reducer } from './state';

export const purchaseOrderAggregate: AggregateConfig<
  PurchaseOrderCommand,
  PurchaseOrderEvent,
  PurchaseOrderState,
  PurchaseOrderError
> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type {
  PurchaseOrderCommand,
  PurchaseOrderEvent,
  PurchaseOrderState,
  PurchaseOrderError,
};

// Re-export command factories
export { createPurchaseOrder } from './commands';

// Re-export event types and factories
export type { PurchaseOrderCreated } from './events';
export { createPurchaseOrderCreated } from './events';
