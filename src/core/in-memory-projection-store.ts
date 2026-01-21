import type { ProjectionStore } from './projection';

/**
 * In-memory projection store for development and testing
 * Not suitable for production - data is lost on restart
 */
export class InMemoryProjectionStore<TState>
  implements ProjectionStore<TState>
{
  private data = new Map<string, TState>();

  async get(id: string): Promise<TState | undefined> {
    return this.data.get(id);
  }

  async set(id: string, state: TState): Promise<void> {
    this.data.set(id, state);
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async getAll(): Promise<Map<string, TState>> {
    return new Map(this.data);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}
