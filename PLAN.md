# RISE v0.4.0 実行計画

## Purpose / Big Picture

**ユーザーが得るもの:**
1. **Snapshot**: 大量イベントを持つ Aggregate でも高速に状態を復元
2. **Projection**: 複数 Aggregate にまたがる Read Model を構築
3. **拡張性**: 将来の外部 DB（PostgreSQL/Redis 等）対応のためのクリーンなインターフェース

**確認方法:**
- `pnpm test` が全て通る（Snapshot/Projection のテスト追加）
- `pnpm tsx examples/snapshot-demo.ts` でスナップショットのデモが実行できる
- `pnpm tsx examples/projection-demo.ts` でプロジェクションのデモが実行できる

---

## Progress

### Milestone 1: Snapshot 機能 [COMPLETED]
- [x] `Snapshot` 型と `SnapshotStore` インターフェース定義 (`src/core/snapshot-store.ts`)
- [x] `InMemorySnapshotStore` の実装
- [x] `EventStore.readStream` に `fromVersion` パラメータを追加
- [x] `Engine` のリハイドレーションロジックを Snapshot 対応に更新
- [x] `engine.snapshot(streamId)` 手動実行の実装
- [x] `snapshotEvery: number` による自動スナップショットの実装（オプトイン）
- [x] Snapshot のユニットテスト追加 (16 tests)
- [x] `examples/snapshot-demo.ts` 作成

### Milestone 2: Projection 機能 [COMPLETED]
- [x] `Projection` インターフェース定義 (`src/core/projection.ts`)
- [x] `ProjectionStore` インターフェース定義
- [x] `defineProjection()` ヘルパー関数の追加 (`src/lib/projections.ts`)
- [x] `InMemoryProjectionStore` の実装
- [x] `Projector` クラスの実装（`rebuild()` + EventBus 連携）
- [x] Projection のユニットテスト追加 (17 tests)
- [x] `examples/projection-demo.ts` 作成

### Milestone 3: ドキュメント・リリース [COMPLETED]
- [x] `src/index.ts` からの新規 API エクスポート
- [x] README 更新（Snapshot/Projection の説明）
- [x] package.json version を 0.4.0 に更新

---

## Context and Orientation

### ファイル構成（v0.4.0 追加分）

```
src/
├── index.ts                     # Public API（追加エクスポート）
├── lib/
│   ├── result.ts
│   ├── events.ts
│   ├── errors.ts
│   └── projections.ts           # NEW: defineProjection ヘルパー
└── core/
    ├── engine.ts                # 更新: Snapshot 対応
    ├── event-store.ts           # 更新: fromVersion パラメータ追加
    ├── in-memory-store.ts       # 更新: fromVersion 対応
    ├── event-bus.ts
    ├── snapshot-store.ts        # NEW: SnapshotStore インターフェース
    ├── in-memory-snapshot-store.ts  # NEW
    ├── projection.ts            # NEW: Projection インターフェース
    ├── projector.ts             # NEW: Projector クラス
    └── in-memory-projection-store.ts  # NEW

examples/
├── cart/
├── order-flow/
├── order-flow-saga/
├── snapshot-demo.ts             # NEW
└── projection-demo.ts           # NEW
```

### 設計方針

| 方針 | 説明 |
|------|------|
| Explicit by Default | Snapshot は明示的呼び出しが基本、自動はオプトイン |
| CQRS 分離 | Engine は書き込み、Projection は読み込み（EventBus 経由）|
| Provider Pattern | Store は全て抽象インターフェース、将来の DB 対応を容易に |
| アダプター別パッケージ | コアはゼロ依存を維持、`@rise/adapter-*` で拡張 |

---

## API Design

### 1. Snapshot

```typescript
// src/core/snapshot-store.ts
export interface Snapshot<TState> {
  readonly streamId: string;
  readonly version: number;  // スナップショット時点のイベントバージョン
  readonly state: TState;
  readonly timestamp: number;
}

export interface SnapshotStore<TState> {
  save(snapshot: Snapshot<TState>): Promise<void>;
  load(streamId: string): Promise<Snapshot<TState> | undefined>;
}

// Engine オプション拡張
interface EngineOptions<TState, TEvent, TError> {
  bus?: EventPublisher;
  snapshotStore?: SnapshotStore<TState>;
  snapshotEvery?: number;  // オプトイン: N イベントごとに自動保存
}

// Engine メソッド追加
class Engine<...> {
  async snapshot(streamId: string): Promise<void>;
}
```

### 2. EventStore 拡張

```typescript
// src/core/event-store.ts（更新）
export interface EventStore<TEvent extends DomainEvent> {
  append(streamId: string, events: TEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<TEvent[]>;
  getAllEvents?(): Promise<TEvent[]>;
}
```

### 3. Projection

```typescript
// src/core/projection.ts
export interface Projection<TState, TEvent extends DomainEvent> {
  readonly name: string;
  readonly init: () => TState;
  readonly apply: (state: TState, event: TEvent) => TState;
}

export interface ProjectionStore<TState> {
  get(id: string): Promise<TState | undefined>;
  set(id: string, state: TState): Promise<void>;
  getAll(): Promise<Map<string, TState>>;
}

// src/core/projector.ts
export class Projector<TState, TEvent extends DomainEvent> {
  constructor(
    projection: Projection<TState, TEvent>,
    store: ProjectionStore<TState>,
    idSelector: (event: TEvent) => string
  );
  
  handle(event: TEvent): Promise<void>;           // 単一イベント処理
  rebuild(events: TEvent[]): Promise<void>;       // バッチ再構築
  subscribe(bus: EventBus<TEvent>): () => void;   // EventBus 連携
}

// src/lib/projections.ts
export const defineProjection = <TState, TEvent extends DomainEvent>(
  name: string,
  init: () => TState,
  apply: (state: TState, event: TEvent) => TState
): Projection<TState, TEvent>;
```

---

## Decision Log

| 日付 | 決定 | 理由 |
|------|------|------|
| 2026-01-21 | DomainEvent を interface に変更 | FP スタイル対応、学習コスト削減 |
| 2026-01-21 | Engine 内部で CustomEvent ラップ | EventTarget 互換を維持しつつユーザーは Plain Object |
| 2026-01-21 | defineEvent/defineError ヘルパー追加 | ボイラープレート削減 |
| 2026-01-21 | DomainEventClass は deprecated として残す | 後方互換性 |
| 2026-01-21 | Snapshot は明示的呼び出しがデフォルト | 透明性重視、ユーザーがタイミングを制御 |
| 2026-01-21 | EventStore に fromVersion 追加 | Snapshot 以降のイベントのみを効率的に読み込むため |
| 2026-01-21 | Projection は Engine から独立 | CQRS: 書き込み(Engine)と読み込み(Projection)を分離 |
| 2026-01-21 | アダプターは別パッケージ | コアのゼロ依存を維持 |

---

## Outcomes & Retrospective

### v0.4.0 の成果

- **Snapshot 機能**: 大量イベントでも高速リハイドレーション
- **Projection 機能**: Read Model 構築のための CQRS パターン
- **テスト**: 46 → 79 tests に増加
- **インターフェース設計**: 将来の DB アダプター拡張が容易

### v0.3.0 の成果

- **学習コスト削減**: class 継承不要、Plain Object で定義可能
- **FP/OOP 両対応**: ユーザーが好きなスタイルを選択可能
- **テスト**: 36 → 46 tests に増加
- **サンプル改善**: order-flow が EventBus パターンで動作
- **補償パターン**: order-flow-saga で Reactor による補償を実証

---

## Future Steps (v0.5.0 以降)

- [ ] `@rise/adapter-postgres` パッケージ
- [ ] `@rise/adapter-redis` パッケージ
- [ ] CLI ツール (`rise init` でプロジェクト生成)
- [ ] Saga サポート (`defineSaga()` ヘルパー)
