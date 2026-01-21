import type { DomainEvent } from '../lib/events';

/**
 * Interface for event persistence
 * Implementations can be in-memory, PostgreSQL, DynamoDB, etc.
 */
export interface EventStore<TEvent extends DomainEvent = DomainEvent> {
  /**
   * Read events for a stream
   * @param streamId - Unique identifier for the event stream (e.g., "cart-123")
   * @param fromVersion - Optional: start reading from this version (0-based, exclusive)
   * @returns Array of events in order they were appended
   */
  readStream(streamId: string, fromVersion?: number): Promise<TEvent[]>;

  /**
   * Append events to a stream with optimistic locking
   * @param streamId - Unique identifier for the event stream
   * @param events - Events to append
   * @param expectedVersion - Expected current version (number of existing events)
   * @throws Error if version mismatch (optimistic lock failure)
   */
  appendToStream(
    streamId: string,
    events: TEvent[],
    expectedVersion: number
  ): Promise<void>;
}
