export class PaymentAlreadyProcessedError extends Error {
  readonly _tag = 'PaymentAlreadyProcessedError';
  constructor(orderId: string) {
    super(`Payment for order "${orderId}" has already been processed`);
    this.name = 'PaymentAlreadyProcessedError';
  }
}

export type PaymentError = PaymentAlreadyProcessedError;
