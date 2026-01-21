export class OrderAlreadyExistsError extends Error {
  readonly _tag = 'OrderAlreadyExistsError';
  constructor(orderId: string) {
    super(`Order "${orderId}" already exists`);
    this.name = 'OrderAlreadyExistsError';
  }
}

export class OrderNotFoundError extends Error {
  readonly _tag = 'OrderNotFoundError';
  constructor(orderId: string) {
    super(`Order "${orderId}" not found`);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderAlreadyConfirmedError extends Error {
  readonly _tag = 'OrderAlreadyConfirmedError';
  constructor(orderId: string) {
    super(`Order "${orderId}" is already confirmed`);
    this.name = 'OrderAlreadyConfirmedError';
  }
}

export type OrderError = OrderAlreadyExistsError | OrderNotFoundError | OrderAlreadyConfirmedError;
