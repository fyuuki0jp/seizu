// Domain Errors - business rule violations (recoverable)

export class CartNotFoundError extends Error {
  readonly _tag = 'CartNotFoundError';
  constructor(cartId: string) {
    super(`Cart "${cartId}" does not exist`);
    this.name = 'CartNotFoundError';
  }
}

export class CartAlreadyExistsError extends Error {
  readonly _tag = 'CartAlreadyExistsError';
  constructor(cartId: string) {
    super(`Cart "${cartId}" already exists`);
    this.name = 'CartAlreadyExistsError';
  }
}

export class ItemNotInCartError extends Error {
  readonly _tag = 'ItemNotInCartError';
  constructor(itemId: string) {
    super(`Item "${itemId}" is not in the cart`);
    this.name = 'ItemNotInCartError';
  }
}

export class InvalidQuantityError extends Error {
  readonly _tag = 'InvalidQuantityError';
  constructor(quantity: number) {
    super(`Quantity must be positive, got ${quantity}`);
    this.name = 'InvalidQuantityError';
  }
}

export type CartError =
  | CartNotFoundError
  | CartAlreadyExistsError
  | ItemNotInCartError
  | InvalidQuantityError;
