import type { DomainEvent } from '../lib/events';

/**
 * Projection definition for building read models
 *
 * A projection transforms a stream of events into a queryable state.
 * It defines how to initialize state and how to apply each event.
 *
 * @example
 * const orderSummary: Projection<OrderSummaryState, OrderEvent> = {
 *   name: 'OrderSummary',
 *   init: () => ({ totalOrders: 0, totalAmount: 0 }),
 *   apply: (state, event) => {
 *     if (event.type === 'OrderPlaced') {
 *       return { ...state, totalOrders: state.totalOrders + 1 };
 *     }
 *     return state;
 *   },
 * };
 */
export interface Projection<TState, TEvent extends DomainEvent = DomainEvent> {
  /** Unique name for this projection */
  readonly name: string;
  /** Initialize the projection state */
  readonly init: () => TState;
  /** Apply an event to the current state, returning the new state */
  readonly apply: (state: TState, event: TEvent) => TState;
}

/**
 * Store for persisting projection state
 *
 * Implementations can be in-memory (for testing), Redis, PostgreSQL, etc.
 */
export interface ProjectionStore<TState> {
  /**
   * Get the current state for a given ID
   * @returns The state, or undefined if not found
   */
  get(id: string): Promise<TState | undefined>;

  /**
   * Set the state for a given ID
   */
  set(id: string, state: TState): Promise<void>;

  /**
   * Delete the state for a given ID
   */
  delete(id: string): Promise<void>;

  /**
   * Get all states in the store
   * @returns A Map of ID to state
   */
  getAll(): Promise<Map<string, TState>>;

  /**
   * Clear all states from the store
   */
  clear(): Promise<void>;
}
