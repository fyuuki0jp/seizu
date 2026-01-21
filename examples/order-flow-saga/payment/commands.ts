import type { Command } from '../../../src';

export interface ProcessPayment extends Command {
  type: 'ProcessPayment';
  orderId: string;
  amount: number;
}

export type PaymentCommand = ProcessPayment;

export const processPayment = (orderId: string, amount: number): ProcessPayment => ({
  type: 'ProcessPayment',
  streamId: `payment-${orderId}`,
  orderId,
  amount,
});
