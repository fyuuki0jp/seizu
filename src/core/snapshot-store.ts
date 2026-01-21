/**
 * Snapshot of aggregate state at a specific version
 */
export interface Snapshot<TState> {
  readonly streamId: string;
  readonly version: number; // イベントのバージョン（= イベント数）
  readonly state: TState;
  readonly timestamp: number;
}

/**
 * Interface for snapshot persistence
 * Implementations can be in-memory, Redis, PostgreSQL, etc.
 */
export interface SnapshotStore<TState> {
  /**
   * Save a snapshot
   * @param snapshot - The snapshot to save
   */
  save(snapshot: Snapshot<TState>): Promise<void>;

  /**
   * Load the latest snapshot for a stream
   * @param streamId - Unique identifier for the event stream
   * @returns The snapshot if found, undefined otherwise
   */
  load(streamId: string): Promise<Snapshot<TState> | undefined>;
}
