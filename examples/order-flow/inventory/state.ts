import type { InventoryEvent } from './events';

export interface InventoryState {
  initialized: boolean;
  productId: string | null;
  available: number; // 利用可能な在庫
  reserved: number; // 予約済みの在庫
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
    case 'StockDepleted':
      // StockDepleted は状態を直接変更しない（通知用イベント）
      return state;
    default:
      return state;
  }
};
