import type {
  DomainEvent,
  EventType,
  IdGenerator,
  ToEventMap,
} from '../lib/events';
import { ensureMeta, wrapAsCustomEvent } from '../lib/events';
import type { Result } from '../lib/result';
import type { EventStore } from './event-store';
import type { SnapshotStore } from './snapshot-store';

/**
 * Configuration for an aggregate (domain entity)
 */
export interface AggregateConfig<
  TCommand,
  TEvent extends DomainEvent,
  TState,
  TError,
> {
  /** Initial state before any events */
  initialState: TState;
  /** Pure function: (state, event) => newState */
  reducer: (state: TState, event: TEvent) => TState;
  /** Pure function: (command, state) => Result<events, error> */
  decider: (command: TCommand, state: TState) => Result<TEvent[], TError>;
}

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
  publish(event: DomainEvent): void | Promise<void>;
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
  /** Custom ID generator for event metadata */
  idGenerator?: IdGenerator;
  /** Hook for async publish errors */
  onPublishError?: (error: unknown, event: DomainEvent) => void;
}

/**
 * Main orchestrator for Event Sourcing
 * Extends EventTarget for reactive event dispatching (Reactor pattern)
 */
export class Engine<
  TCommand extends Command = Command,
  TEvent extends DomainEvent = DomainEvent,
  TState = unknown,
  TError = Error,
> extends EventTarget {
  private readonly bus?: EventPublisher;
  private readonly snapshotStore?: SnapshotStore<TState>;
  private readonly snapshotEvery?: number;
  private readonly idGenerator?: IdGenerator;
  private readonly onPublishError?: (
    error: unknown,
    event: DomainEvent
  ) => void;

  constructor(
    private readonly eventStore: EventStore<TEvent>,
    private readonly config: AggregateConfig<TCommand, TEvent, TState, TError>,
    options?: EngineOptions<TState>
  ) {
    super();
    this.bus = options?.bus;
    this.snapshotStore = options?.snapshotStore;
    this.snapshotEvery = options?.snapshotEvery;
    this.idGenerator = options?.idGenerator;
    this.onPublishError = options?.onPublishError;
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
    const snapshotData = this.snapshotStore
      ? await this.snapshotStore.load(command.streamId)
      : undefined;
    const fromVersion = snapshotData?.version ?? 0;
    const initialState = snapshotData?.state ?? this.config.initialState;

    const existingEvents = await this.eventStore.readStream(
      command.streamId,
      fromVersion
    );
    const totalVersion = fromVersion + existingEvents.length;

    const state = existingEvents.reduce(this.config.reducer, initialState);

    const decision = this.config.decider(command, state);
    if (!decision.ok) {
      return decision;
    }

    const newEvents = decision.value;
    const eventsWithMeta = newEvents.map((event) =>
      ensureMeta(event, this.idGenerator)
    );

    await this.eventStore.appendToStream(
      command.streamId,
      eventsWithMeta,
      totalVersion
    );

    for (const eventWithMeta of eventsWithMeta) {
      const customEvent = wrapAsCustomEvent(eventWithMeta);
      this.dispatchEvent(customEvent);

      if (this.bus) {
        const result = this.bus.publish(eventWithMeta);
        if (result instanceof Promise) {
          result.catch((error) => {
            this.onPublishError?.(error, eventWithMeta);
          });
        }
      }
    }

    // Auto-snapshot if configured
    if (this.snapshotStore && this.snapshotEvery) {
      const newTotalVersion = totalVersion + newEvents.length;
      const lastSnapshotVersion = snapshotData?.version ?? 0;
      const eventsSinceSnapshot = newTotalVersion - lastSnapshotVersion;

      if (eventsSinceSnapshot >= this.snapshotEvery) {
        await this.snapshot(command.streamId);
      }
    }

    return { ok: true, value: eventsWithMeta };
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

    // Load existing snapshot to build incrementally (performance optimization)
    const existingSnapshot = await this.snapshotStore.load(streamId);
    const fromVersion = existingSnapshot?.version ?? 0;
    const baseState = existingSnapshot?.state ?? this.config.initialState;

    // Only read events since the last snapshot
    const events = await this.eventStore.readStream(streamId, fromVersion);
    const state = events.reduce(this.config.reducer, baseState);
    const version = fromVersion + events.length;

    await this.snapshotStore.save({
      streamId,
      version,
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

      // Fail Fast: originalEvent は wrapAsCustomEvent() により常に設定される不変条件
      if (!customEvent.originalEvent) {
        throw new Error(
          `Event "${e.type}" was dispatched without originalEvent. ` +
            `This indicates a programming error. Use Engine.execute() to dispatch events.`
        );
      }

      handler(customEvent.originalEvent as ToEventMap<TEvent>[K]);
    };
    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }
}
