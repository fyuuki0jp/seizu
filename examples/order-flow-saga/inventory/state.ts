import type { InventoryEvent } from './events';

export interface InventoryState {
  initialized: boolean;
  productId: string | null;
  available: number;
  reserved: number;
}

export const initialState: InventoryState = {
  initialized: false,
  productId: null,
  available: 0,
  reserved: 0,
};

export const reducer = (
  state: InventoryState,
  event: InventoryEvent
): InventoryState => {
  switch (event.type) {
    case 'StockInitialized':
      return {
        ...state,
        initialized: true,
        productId: event.data.productId,
        available: event.data.quantity,
      };
    case 'StockReserved':
      return {
        ...state,
        available: state.available - event.data.quantity,
        reserved: state.reserved + event.data.quantity,
      };
    case 'StockReleased':
      return {
        ...state,
        available: state.available + event.data.quantity,
        reserved: state.reserved - event.data.quantity,
      };
    default:
      return state;
  }
};
