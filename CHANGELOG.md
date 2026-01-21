# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-01-21

### Added
- MIT License file
- GitHub Actions CI workflow (Node.js 20/22)
- Biome linter/formatter configuration
- lint-staged + husky pre-commit hooks
- Dual CJS/ESM publishing support
- CONTRIBUTING.md
- CHANGELOG.md
- Community files (CODE_OF_CONDUCT, SECURITY, issue templates)

### Fixed
- **CRITICAL**: Projector.subscribe now returns Promise for proper error handling
- **MAJOR**: EventBus.on now catches synchronous exceptions
- **MAJOR**: Engine.snapshot optimized to use existing snapshot
- **MINOR**: DomainError type guard validates tag/message types
- **MINOR**: InMemoryStore handles negative fromVersion gracefully

### Changed
- package.json updated with proper npm metadata

## [0.4.0] - 2026-01-21

### Added
- Snapshot functionality for fast aggregate rehydration
  - `SnapshotStore` interface
  - `InMemorySnapshotStore` implementation
  - `Engine.snapshot()` method
  - `snapshotEvery` option for automatic snapshots
- Projection functionality for CQRS read models
  - `Projection` interface
  - `ProjectionStore` interface
  - `InMemoryProjectionStore` implementation
  - `Projector` class with EventBus integration
  - `defineProjection()` helper function
- Example demos: `snapshot-demo.ts`, `projection-demo.ts`

### Changed
- `EventStore.readStream` now accepts optional `fromVersion` parameter

## [0.3.0] - 2026-01-21

### Added
- Plain Object interface for `DomainEvent`
- `defineEvent()` helper function
- `defineError()` helper function
- FP-style API alongside existing class-based API

### Changed
- EventBus and Engine accept Plain Object events
- Improved type inference for events

### Removed
- `DomainEventClass` (deprecated in v0.3.0, use Plain Object style instead)

## [0.2.0] - 2026-01-20

### Added
- `EventBus` for cross-engine communication
- Reactor pattern with async error handling
- order-flow example with EventBus
- order-flow-saga example with compensation

## [0.1.0] - 2026-01-19

### Added
- Initial release
- `Engine` class for Event Sourcing
- `InMemoryEventStore` implementation
- `Result` type for error handling
- Cart example
