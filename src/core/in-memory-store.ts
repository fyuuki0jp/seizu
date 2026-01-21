import type { DomainEvent } from '../lib/events';
import type { EventStore } from './event-store';

/**
 * In-memory event store for development and testing
 * Not suitable for production - data is lost on restart
 */
export class InMemoryEventStore<TEvent extends DomainEvent = DomainEvent>
  implements EventStore<TEvent>
{
  private streams = new Map<string, TEvent[]>();

  async readStream(streamId: string, fromVersion?: number): Promise<TEvent[]> {
    const events = this.streams.get(streamId) ?? [];
    if (fromVersion !== undefined && fromVersion > 0) {
      return events.slice(fromVersion);
    }
    return events;
  }

  async appendToStream(
    streamId: string,
    events: TEvent[],
    expectedVersion: number
  ): Promise<void> {
    const currentEvents = this.streams.get(streamId) ?? [];
    const currentVersion = currentEvents.length;

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict on stream "${streamId}": expected version ${expectedVersion}, got ${currentVersion}`
      );
    }

    this.streams.set(streamId, [...currentEvents, ...events]);
  }

  /** Clear all streams (useful for testing) */
  clear(): void {
    this.streams.clear();
  }
}
