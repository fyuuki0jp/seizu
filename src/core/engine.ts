import type { Result } from '../lib/result';
import type { DomainEvent, ToEventMap, EventType, EventMeta } from '../lib/events';
import { createMeta } from '../lib/events';
import type { EventStore } from './event-store';
import type { SnapshotStore, Snapshot } from './snapshot-store';

/**
 * Configuration for an aggregate (domain entity)
 */
export interface AggregateConfig<
  TCommand,
  TEvent extends DomainEvent,
  TState,
  TError
> {
  /** Initial state before any events */
  initialState: TState;
  /** Pure function: (state, event) => newState */
  reducer: (state: TState, event: TEvent) => TState;
  /** Pure function: (command, state) => Result<events, error> */
  decider: (command: TCommand, state: TState) => Result<TEvent[], TError>;
}

/**
 * Type inference helpers for AggregateConfig
 * These extract the type parameters from a config object
 */
export type InferCommand<T> = T extends AggregateConfig<infer C, any, any, any> ? C : never;
export type InferEvent<T> = T extends AggregateConfig<any, infer E, any, any> ? E : never;
export type InferState<T> = T extends AggregateConfig<any, any, infer S, any> ? S : never;
export type InferError<T> = T extends AggregateConfig<any, any, any, infer Err> ? Err : never;

/**
 * Command with required streamId
 */
export interface Command {
  type: string;
  streamId: string;
}

/**
 * Interface for publishing events to a bus.
 * This allows Engine to work with any EventBus regardless of its type parameter.
 */
export interface EventPublisher {
  publish(event: DomainEvent): void;
}

/**
 * Optional configuration for Engine behavior
 */
export interface EngineOptions<TState = unknown> {
  /** Shared EventBus for cross-engine communication.
   * The bus can accept any event type that is a supertype of this Engine's events.
   * This allows multiple Engines with different event types to share one bus. */
  bus?: EventPublisher;
  /** Snapshot store for persisting aggregate state */
  snapshotStore?: SnapshotStore<TState>;
  /** Automatically save snapshot every N events (opt-in) */
  snapshotEvery?: number;
}

/**
 * Internal: Wrap a Plain Object event as CustomEvent for EventTarget compatibility
 */
const wrapAsCustomEvent = <E extends DomainEvent>(
  event: E
): CustomEvent<E['data']> & { originalEvent: E } => {
  const customEvent = new CustomEvent(event.type, {
    detail: event.data,
  }) as CustomEvent<E['data']> & { originalEvent: E };
  customEvent.originalEvent = event;
  return customEvent;
};

/**
 * Internal: Ensure event has meta, adding if missing
 */
const ensureMeta = <E extends DomainEvent>(event: E): E & { meta: EventMeta } => {
  if (event.meta) {
    return event as E & { meta: EventMeta };
  }
  return { ...event, meta: createMeta() } as E & { meta: EventMeta };
};

/**
 * Main orchestrator for Event Sourcing
 * Extends EventTarget for reactive event dispatching (Reactor pattern)
 */
export class Engine<
  TCommand extends Command = Command,
  TEvent extends DomainEvent = DomainEvent,
  TState = unknown,
  TError = Error
> extends EventTarget {
  private readonly bus?: EventPublisher;
  private readonly snapshotStore?: SnapshotStore<TState>;
  private readonly snapshotEvery?: number;

  constructor(
    private readonly eventStore: EventStore<TEvent>,
    private readonly config: AggregateConfig<TCommand, TEvent, TState, TError>,
    options?: EngineOptions<TState>
  ) {
    super();
    this.bus = options?.bus;
    this.snapshotStore = options?.snapshotStore;
    this.snapshotEvery = options?.snapshotEvery;
  }

  /**
   * Execute a command through the Event Sourcing cycle:
   * 1. Load snapshot (if available) and events from store
   * 2. Rehydrate state using reducer
   * 3. Run decider to get new events (or error)
   * 4. Append events to store
   * 5. Dispatch events for reactors
   * 6. Auto-snapshot if configured
   *
   * @param command - The command to execute
   * @returns Result with new events on success, or error on failure
   */
  async execute(command: TCommand): Promise<Result<TEvent[], TError>> {
    // 1. Load Snapshot (if available)
    const snapshotData = this.snapshotStore
      ? await this.snapshotStore.load(command.streamId)
      : undefined;
    const fromVersion = snapshotData?.version ?? 0;
    const initialState = snapshotData?.state ?? this.config.initialState;

    // 2. Load History (from snapshot version onwards)
    const existingEvents = await this.eventStore.readStream(
      command.streamId,
      fromVersion
    );
    const totalVersion = fromVersion + existingEvents.length;

    // 3. Rehydrate State
    const state = existingEvents.reduce(this.config.reducer, initialState);

    // 4. Decide
    const decision = this.config.decider(command, state);
    if (!decision.ok) {
      return decision;
    }

    const newEvents = decision.value;

    // 5. Commit to Store
    await this.eventStore.appendToStream(
      command.streamId,
      newEvents,
      totalVersion
    );

    // 6. Dispatch for Reactors
    for (const event of newEvents) {
      // Ensure meta is present
      const eventWithMeta = ensureMeta(event);

      // Wrap as CustomEvent and dispatch
      const customEvent = wrapAsCustomEvent(eventWithMeta);
      this.dispatchEvent(customEvent);

      // Publish to EventBus (Plain Object)
      if (this.bus) {
        this.bus.publish(eventWithMeta);
      }
    }

    // 7. Auto-snapshot if configured
    if (this.snapshotStore && this.snapshotEvery) {
      const newTotalVersion = totalVersion + newEvents.length;
      const lastSnapshotVersion = snapshotData?.version ?? 0;
      const eventsSinceSnapshot = newTotalVersion - lastSnapshotVersion;

      if (eventsSinceSnapshot >= this.snapshotEvery) {
        await this.snapshot(command.streamId);
      }
    }

    return decision;
  }

  /**
   * Get current state for a stream (for queries/debugging)
   */
  async getState(streamId: string): Promise<TState> {
    // Use snapshot if available
    const snapshotData = this.snapshotStore
      ? await this.snapshotStore.load(streamId)
      : undefined;
    const fromVersion = snapshotData?.version ?? 0;
    const initialState = snapshotData?.state ?? this.config.initialState;

    const events = await this.eventStore.readStream(streamId, fromVersion);
    return events.reduce(this.config.reducer, initialState);
  }

  /**
   * Save a snapshot of the current state for a stream
   * @param streamId - The stream to snapshot
   */
  async snapshot(streamId: string): Promise<void> {
    if (!this.snapshotStore) {
      throw new Error('No snapshot store configured');
    }

    const events = await this.eventStore.readStream(streamId);
    const state = events.reduce(this.config.reducer, this.config.initialState);

    await this.snapshotStore.save({
      streamId,
      version: events.length,
      state,
      timestamp: Date.now(),
    });
  }

  /**
   * 型安全なイベントリスナー登録
   * 
   * @example
   * engine.on('ItemAdded', (event) => {
   *   console.log(event.data.itemId); // 型推論される
   * });
   * 
   * @param type - イベントタイプ（リテラル型）
   * @param handler - イベントハンドラー
   * @returns unsubscribe 関数
   */
  on<K extends EventType<TEvent>>(
    type: K,
    handler: (event: ToEventMap<TEvent>[K]) => void
  ): () => void {
    const listener = (e: Event) => {
      // Extract original Plain Object from CustomEvent wrapper
      const customEvent = e as CustomEvent & { originalEvent?: DomainEvent };
      const event = customEvent.originalEvent ?? {
        type: e.type,
        data: (e as CustomEvent).detail,
      };
      handler(event as ToEventMap<TEvent>[K]);
    };
    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }
}
