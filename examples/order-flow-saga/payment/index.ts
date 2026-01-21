import type { AggregateConfig } from '../../../src';
import { initialState, reducer } from './state';
import { decider } from './decider';
import type { PaymentCommand } from './commands';
import type { PaymentEvent } from './events';
import type { PaymentState } from './state';
import type { PaymentError } from './errors';

export const paymentAggregate: AggregateConfig<PaymentCommand, PaymentEvent, PaymentState, PaymentError> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { PaymentCommand, PaymentEvent, PaymentState, PaymentError };

// Re-export command factories
export { processPayment } from './commands';

// Re-export event types and factories
export type { PaymentProcessed, PaymentFailed } from './events';
export { createPaymentProcessed, createPaymentFailed } from './events';
