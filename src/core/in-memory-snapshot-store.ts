import type { Snapshot, SnapshotStore } from './snapshot-store';

/**
 * In-memory snapshot store for development and testing
 * Not suitable for production - data is lost on restart
 */
export class InMemorySnapshotStore<TState> implements SnapshotStore<TState> {
  private snapshots = new Map<string, Snapshot<TState>>();

  async save(snapshot: Snapshot<TState>): Promise<void> {
    this.snapshots.set(snapshot.streamId, snapshot);
  }

  async load(streamId: string): Promise<Snapshot<TState> | undefined> {
    return this.snapshots.get(streamId);
  }

  /** Clear all snapshots (useful for testing) */
  clear(): void {
    this.snapshots.clear();
  }
}
