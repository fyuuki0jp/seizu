import type { AggregateConfig } from '../../../src';
import { initialState, reducer } from './state';
import { decider } from './decider';
import type { InventoryCommand } from './commands';
import type { InventoryEvent } from './events';
import type { InventoryState } from './state';
import type { InventoryError } from './errors';

export const inventoryAggregate: AggregateConfig<InventoryCommand, InventoryEvent, InventoryState, InventoryError> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type { InventoryCommand, InventoryEvent, InventoryState, InventoryError };

// Re-export command factories
export { initializeStock, reserveStock, releaseStock } from './commands';

// Re-export event types and factories
export type { StockInitialized, StockReserved, StockDepleted, StockReleased } from './events';
export {
  createStockInitialized,
  createStockReserved,
  createStockDepleted,
  createStockReleased,
} from './events';
