import type { DomainEvent } from '../../src';
import { createMeta } from '../../src';

// Domain Events - what happened (past tense, immutable facts)
// Using Plain Object style

export type CartCreated = DomainEvent<
  'CartCreated',
  { cartId: string; userId: string }
>;

export type ItemAdded = DomainEvent<
  'ItemAdded',
  { itemId: string; quantity: number; price: number }
>;

export type ItemRemoved = DomainEvent<'ItemRemoved', { itemId: string }>;

// Event factory functions
export const createCartCreated = (
  cartId: string,
  userId: string
): CartCreated => ({
  type: 'CartCreated',
  data: { cartId, userId },
  meta: createMeta(),
});

export const createItemAdded = (
  itemId: string,
  quantity: number,
  price: number
): ItemAdded => ({
  type: 'ItemAdded',
  data: { itemId, quantity, price },
  meta: createMeta(),
});

export const createItemRemoved = (itemId: string): ItemRemoved => ({
  type: 'ItemRemoved',
  data: { itemId },
  meta: createMeta(),
});

// Union type for all cart events
export type CartEvent = CartCreated | ItemAdded | ItemRemoved;
