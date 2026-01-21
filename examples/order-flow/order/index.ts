import type { AggregateConfig } from '../../../src';
import { initialState, reducer } from './state';
import { decider } from './decider';
import type { OrderCommand } from './commands';
import type { OrderEvent } from './events';
import type { OrderState } from './state';
import type { OrderError } from './errors';

export const orderAggregate: AggregateConfig<OrderCommand, OrderEvent, OrderState, OrderError> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { OrderCommand, OrderEvent, OrderState, OrderError };

// Re-export command factories
export { placeOrder, confirmOrder } from './commands';

// Re-export event types and factories
export type { OrderPlaced, OrderConfirmed } from './events';
export { createOrderPlaced, createOrderConfirmed } from './events';
