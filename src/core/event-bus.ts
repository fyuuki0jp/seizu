import type { DomainEvent, EventType, ToEventMap } from '../lib/events';
import { ensureMeta, wrapAsCustomEvent } from '../lib/events';

/**
 * Error handler for async reactor failures
 */
export type ReactorErrorHandler<E = unknown> = (
  error: unknown,
  event: E
) => void;

/**
 * EventBus options
 */
export interface EventBusOptions<TEvent extends DomainEvent = DomainEvent> {
  /** Global error handler for all reactor failures */
  onError?: ReactorErrorHandler<TEvent>;
}

/**
 * Central event bus for multiple Engine instances
 *
 * @example
 * const bus = new EventBus<OrderEvent | InventoryEvent>();
 *
 * // Subscribe to events
 * bus.on('OrderPlaced', async (event) => {
 *   console.log(event.data.orderId);
 * });
 *
 * // Publish events (usually done by Engine)
 * bus.publish({ type: 'OrderPlaced', data: { orderId: 'order-1', productId: 'apple', quantity: 5 } });
 */
export class EventBus<
  TEvent extends DomainEvent = DomainEvent,
> extends EventTarget {
  private globalErrorHandler?: ReactorErrorHandler<TEvent>;

  constructor(options?: EventBusOptions<TEvent>) {
    super();
    if (options?.onError) {
      this.globalErrorHandler = options.onError;
    }
  }

  /**
   * Publish an event to all subscribers
   * Accepts Plain Object events (wraps internally as CustomEvent)
   */
  publish(event: TEvent): void {
    const eventWithMeta = ensureMeta(event);
    const customEvent = wrapAsCustomEvent(eventWithMeta);
    this.dispatchEvent(customEvent);
  }

  /**
   * Type-safe event subscription with async support
   *
   * @param type - Event type (literal type)
   * @param handler - Event handler (can be async)
   * @param options - Optional error handler for this specific subscription
   * @returns Unsubscribe function
   */
  on<K extends EventType<TEvent>>(
    type: K,
    handler: (event: ToEventMap<TEvent>[K]) => void | Promise<void>,
    options?: { onError?: ReactorErrorHandler<ToEventMap<TEvent>[K]> }
  ): () => void {
    const listener = (e: Event) => {
      // Extract original Plain Object from CustomEvent wrapper
      const customEvent = e as CustomEvent & { originalEvent?: DomainEvent };

      // Fail Fast: originalEvent は wrapAsCustomEvent() により常に設定される不変条件
      if (!customEvent.originalEvent) {
        throw new Error(
          `Event "${e.type}" was dispatched without originalEvent. ` +
            `This indicates a programming error. Use EventBus.publish() for direct event dispatch,` +
            ` or Engine.execute() to emit events as a result of command execution.`
        );
      }

      const event = customEvent.originalEvent as ToEventMap<TEvent>[K];

      // Handle both sync and async handlers with try-catch for sync exceptions
      try {
        Promise.resolve(handler(event)).catch((error) => {
          this.handleError(error, event, options?.onError);
        });
      } catch (error) {
        this.handleError(error, event, options?.onError);
      }
    };

    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }

  /**
   * Set or update global error handler
   */
  setErrorHandler(handler: ReactorErrorHandler<TEvent>): void {
    this.globalErrorHandler = handler;
  }

  private handleError<E>(
    error: unknown,
    event: E,
    localHandler?: ReactorErrorHandler<E>
  ): void {
    // Call local handler first
    if (localHandler) {
      localHandler(error, event);
    }

    // Then global handler
    if (this.globalErrorHandler) {
      this.globalErrorHandler(error, event as unknown as TEvent);
    }

    // Dispatch error event for additional listeners
    this.dispatchEvent(new CustomEvent('error', { detail: { error, event } }));
  }
}
