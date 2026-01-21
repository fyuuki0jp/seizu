import type { Command } from '../../src';

// Commands - user intentions (imperative, may fail)

export interface CreateCart extends Command {
  type: 'CreateCart';
  userId: string;
}

export interface AddItem extends Command {
  type: 'AddItem';
  itemId: string;
  quantity: number;
  price: number;
}

export interface RemoveItem extends Command {
  type: 'RemoveItem';
  itemId: string;
}

export type CartCommand = CreateCart | AddItem | RemoveItem;

// Command factory helpers (optional, but nice for users)
export const createCart = (streamId: string, userId: string): CreateCart => ({
  type: 'CreateCart',
  streamId,
  userId,
});

export const addItem = (
  streamId: string,
  itemId: string,
  quantity: number,
  price: number
): AddItem => ({
  type: 'AddItem',
  streamId,
  itemId,
  quantity,
  price,
});

export const removeItem = (streamId: string, itemId: string): RemoveItem => ({
  type: 'RemoveItem',
  streamId,
  itemId,
});
