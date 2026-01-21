import type { DomainEvent } from '../lib/events';
import type { EventBus } from './event-bus';
import type { Projection, ProjectionStore } from './projection';

/**
 * Projector - Applies events to a projection and manages state persistence
 *
 * The Projector is responsible for:
 * 1. Handling single events and updating the projection state
 * 2. Rebuilding projections from historical events
 * 3. Subscribing to EventBus for real-time updates
 *
 * @example
 * const store = new InMemoryProjectionStore<OrderSummaryState>();
 * const projector = new Projector(
 *   orderSummaryProjection,
 *   store,
 *   (event) => event.data.orderId
 * );
 *
 * // Handle a single event
 * await projector.handle(orderPlacedEvent);
 *
 * // Rebuild from historical events
 * await projector.rebuild(allOrderEvents);
 *
 * // Subscribe to EventBus
 * const unsubscribe = projector.subscribe(bus, ['OrderPlaced', 'OrderCancelled']);
 */
export class Projector<TState, TEvent extends DomainEvent = DomainEvent> {
  constructor(
    private readonly projection: Projection<TState, TEvent>,
    private readonly store: ProjectionStore<TState>,
    private readonly idSelector: (event: TEvent) => string
  ) {}

  /**
   * Get the projection definition
   */
  get definition(): Projection<TState, TEvent> {
    return this.projection;
  }

  /**
   * Handle a single event and update the projection
   */
  async handle(event: TEvent): Promise<void> {
    const id = this.idSelector(event);
    const current = (await this.store.get(id)) ?? this.projection.init();
    const next = this.projection.apply(current, event);
    await this.store.set(id, next);
  }

  /**
   * Rebuild the projection from a list of events
   * This clears all existing state and replays events in order
   */
  async rebuild(events: TEvent[]): Promise<void> {
    await this.store.clear();
    for (const event of events) {
      await this.handle(event);
    }
  }

  /**
   * Subscribe to specific event types on an EventBus for real-time updates
   *
   * @param bus - The EventBus to subscribe to
   * @param eventTypes - Array of event type names to listen for
   * @returns Unsubscribe function that removes all subscriptions
   *
   * @example
   * const unsubscribe = projector.subscribe(bus, ['OrderPlaced', 'OrderCancelled']);
   * // Later...
   * unsubscribe();
   */
  subscribe<K extends TEvent['type']>(
    bus: EventBus<TEvent>,
    eventTypes: K[]
  ): () => void {
    const unsubscribers = eventTypes.map((eventType) =>
      bus.on(eventType, (event) => {
        // Return the Promise so EventBus error handler can catch async errors
        return this.handle(event as TEvent);
      })
    );

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }
}
