import type { AggregateConfig } from '../../../src';
import type { OrderCommand } from './commands';
import { decider } from './decider';
import type { OrderError } from './errors';
import type { OrderEvent } from './events';
import type { OrderState } from './state';
import { initialState, reducer } from './state';

export const orderAggregate: AggregateConfig<
  OrderCommand,
  OrderEvent,
  OrderState,
  OrderError
> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { OrderCommand, OrderEvent, OrderState, OrderError };

// Re-export command factories
export { cancelOrder, confirmOrder, placeOrder } from './commands';

// Re-export event types and factories
export type { OrderCancelled, OrderConfirmed, OrderPlaced } from './events';
export {
  createOrderCancelled,
  createOrderConfirmed,
  createOrderPlaced,
} from './events';
