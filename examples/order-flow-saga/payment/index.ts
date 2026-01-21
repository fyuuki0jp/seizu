import type { AggregateConfig } from '../../../src';
import type { PaymentCommand } from './commands';
import { decider } from './decider';
import type { PaymentError } from './errors';
import type { PaymentEvent } from './events';
import type { PaymentState } from './state';
import { initialState, reducer } from './state';

export const paymentAggregate: AggregateConfig<
  PaymentCommand,
  PaymentEvent,
  PaymentState,
  PaymentError
> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { PaymentCommand, PaymentEvent, PaymentState, PaymentError };

// Re-export command factories
export { processPayment } from './commands';

// Re-export event types and factories
export type { PaymentFailed, PaymentProcessed } from './events';
export { createPaymentFailed, createPaymentProcessed } from './events';
