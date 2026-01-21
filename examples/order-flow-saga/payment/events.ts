import { createMeta, type DomainEvent } from '../../../src';

export type PaymentProcessed = DomainEvent<'PaymentProcessed', { 
  orderId: string; 
  amount: number;
}>;

export type PaymentFailed = DomainEvent<'PaymentFailed', { 
  orderId: string; 
  reason: string;
}>;

export type PaymentEvent = PaymentProcessed | PaymentFailed;

export const createPaymentProcessed = (orderId: string, amount: number): PaymentProcessed => ({
  type: 'PaymentProcessed',
  data: { orderId, amount },
  meta: createMeta(),
});

export const createPaymentFailed = (orderId: string, reason: string): PaymentFailed => ({
  type: 'PaymentFailed',
  data: { orderId, reason },
  meta: createMeta(),
});
