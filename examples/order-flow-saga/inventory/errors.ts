export class InventoryNotInitializedError extends Error {
  readonly _tag = 'InventoryNotInitializedError';
  constructor(productId: string) {
    super(`Inventory for product "${productId}" is not initialized`);
  }
}

export class InsufficientStockError extends Error {
  readonly _tag = 'InsufficientStockError';
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for "${productId}": requested ${requested}, available ${available}`
    );
  }
}

export class InventoryAlreadyInitializedError extends Error {
  readonly _tag = 'InventoryAlreadyInitializedError';
  constructor(productId: string) {
    super(`Inventory for product "${productId}" is already initialized`);
  }
}

export type InventoryError =
  | InventoryNotInitializedError
  | InsufficientStockError
  | InventoryAlreadyInitializedError;
