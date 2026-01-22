// RISE - Reactive Immutable State Engine

// Core
export {
  type AggregateConfig,
  type Command,
  Engine,
  type EngineOptions,
  type EventPublisher,
} from './core/engine';
export {
  EventBus,
  type EventBusOptions,
  type ReactorErrorHandler,
} from './core/event-bus';
export type { EventStore } from './core/event-store';
export { InMemoryProjectionStore } from './core/in-memory-projection-store';
export { InMemorySnapshotStore } from './core/in-memory-snapshot-store';
export { InMemoryEventStore } from './core/in-memory-store';

// Projection
export type { Projection, ProjectionStore } from './core/projection';
export { Projector } from './core/projector';
// Snapshot
export type { Snapshot, SnapshotStore } from './core/snapshot-store';
export { type DomainError, defineError, isDomainError } from './lib/errors';

// Domain primitives
export {
  createMeta,
  type DomainEvent,
  defaultIdGenerator,
  defineEvent,
  type EventMeta,
  type EventType,
  type IdGenerator,
  type ToEventMap,
  type WrappedCustomEvent,
} from './lib/events';
export { defineProjection } from './lib/projections';
export { err, flatMap, isErr, isOk, map, ok, type Result } from './lib/result';
