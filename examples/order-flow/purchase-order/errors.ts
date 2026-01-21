export class PurchaseOrderAlreadyExistsError extends Error {
  readonly _tag = 'PurchaseOrderAlreadyExistsError';
  constructor(purchaseOrderId: string) {
    super(`Purchase order "${purchaseOrderId}" already exists`);
  }
}

export type PurchaseOrderError = PurchaseOrderAlreadyExistsError;
