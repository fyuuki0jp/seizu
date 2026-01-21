import type { CartEvent } from './events';

// State - derived from events (never stored directly)

export interface CartItem {
  itemId: string;
  quantity: number;
  price: number;
}

export interface CartState {
  exists: boolean;
  userId: string | null;
  items: Map<string, CartItem>;
}

export const initialState: CartState = {
  exists: false,
  userId: null,
  items: new Map(),
};

// Reducer - pure function, never fails
export const reducer = (state: CartState, event: CartEvent): CartState => {
  switch (event.type) {
    case 'CartCreated':
      return {
        ...state,
        exists: true,
        userId: event.data.userId,
      };

    case 'ItemAdded': {
      const { itemId, quantity, price } = event.data;
      const existing = state.items.get(itemId);
      const newItems = new Map(state.items);

      if (existing) {
        newItems.set(itemId, {
          ...existing,
          quantity: existing.quantity + quantity,
        });
      } else {
        newItems.set(itemId, { itemId, quantity, price });
      }

      return { ...state, items: newItems };
    }

    case 'ItemRemoved': {
      const newItems = new Map(state.items);
      newItems.delete(event.data.itemId);
      return { ...state, items: newItems };
    }

    default:
      return state;
  }
};
