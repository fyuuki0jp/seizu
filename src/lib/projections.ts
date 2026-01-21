import type { DomainEvent } from './events';
import type { Projection } from '../core/projection';

/**
 * Helper to define a projection with less boilerplate
 *
 * @example
 * const orderCount = defineProjection(
 *   'OrderCount',
 *   () => ({ count: 0 }),
 *   (state, event) => {
 *     if (event.type === 'OrderPlaced') {
 *       return { count: state.count + 1 };
 *     }
 *     return state;
 *   }
 * );
 */
export const defineProjection = <TState, TEvent extends DomainEvent = DomainEvent>(
  name: string,
  init: () => TState,
  apply: (state: TState, event: TEvent) => TState
): Projection<TState, TEvent> => ({
  name,
  init,
  apply,
});
