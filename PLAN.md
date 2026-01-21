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

---

# OSS公開準備計画 (v0.4.1)

## Vision: Disposable Systems における Core レイヤー構築ライブラリ

### 背景
「Architecture for Disposable Systems」(https://tuananh.net/2026/01/15/architecture-for-disposable-systems/) で提唱される3層アーキテクチャ:

| レイヤー | 役割 | 特性 |
|----------|------|------|
| **Core (Durable)** | ビジネスロジック、データモデル、コアアルゴリズム | 人間が書く、長期維持、堅牢 |
| **Connectors (APIs)** | コンポーネント間の通信契約 | 不変、完璧であるべき |
| **Disposable Layer** | グルーコード、パーサー、UI、統合スクリプト | AI生成、使い捨て可能 |

### RISE の位置づけ
**Core レイヤーを Event Sourcing で効率的に構築するためのフレームワーク**

**設計原則**:
1. **Contract-First**: 型定義・スキーマを最優先、「不変の契約」として堅牢に
2. **Durability は Adapter の責務**: コアはゼロ依存を維持、永続化は差し替え可能
3. **AI協調時代の設計**: AIエージェントがコードを生成・操作しやすい明示的なAPI

---

## OSS品質調査結果サマリー

### 総合評価: B (良好、一部修正必要)

| カテゴリ | 評価 | 備考 |
|----------|------|------|
| コード品質 | ⭐⭐⭐⭐⭐ | 型安全性、構造、可読性が非常に高い |
| Contract-First適合性 | ⭐⭐⭐⭐ | 型定義は堅牢、スキーマ検証は今後の課題 |
| ドキュメント (README) | ⭐⭐⭐⭐⭐ | 充実した使用例とAPI説明 |
| OSS必須ファイル | ⭐⭐ | LICENSE, CONTRIBUTING等が欠如 |
| npm公開準備 | ⭐⭐⭐ | package.jsonのメタデータ不足 |
| CI/CD | ⭐ | GitHub Actions等が未設定 |
| 開発ツール | ⭐⭐⭐ | Linter/Formatterが未設定 |

### Contract-First 適合性の強み
- `DomainEvent`, `DomainError` が `readonly` で不変性を担保
- `ToEventMap`, `EventType` 等の高度な型推論メカニズム
- `EventStore`, `SnapshotStore`, `ProjectionStore` の抽象インターフェース分離
- `Result` 型による明示的なエラーハンドリング

### 改善が必要な領域
- スキーマ検証（Zod等）との統合オプション
- イベントのバージョニング戦略
- ミドルウェア/フック機構

---

## Progress (OSS公開準備)

### Milestone 0: コードレビュー指摘対応 [COMPLETED]
- [x] (2026-01-21 21:59Z) **CRITICAL**: Projector.subscribe の非同期エラー黙殺を修正 (`src/core/projector.ts`)
- [x] (2026-01-21 21:59Z) **MAJOR**: EventBus の同期例外処理を修正 (`src/core/event-bus.ts`)
- [x] (2026-01-21 21:59Z) **MAJOR**: Engine.snapshot のスナップショット活用最適化 (`src/core/engine.ts`)
- [x] (2026-01-21 21:59Z) **MINOR**: DomainError 型ガードに message 型検証追加 (`src/lib/errors.ts`)
- [x] (2026-01-21 21:59Z) **MINOR**: InMemoryStore の負の fromVersion ガード追加

### Milestone 1: 必須ファイル作成 [COMPLETED]
- [x] (2026-01-21 21:59Z) LICENSE (MIT) ファイル作成
- [x] (2026-01-21 21:59Z) package.json メタデータ追加

### Milestone 2: CI/CD 設定 [COMPLETED]
- [x] (2026-01-21 21:59Z) GitHub Actions テストワークフロー作成 (`.github/workflows/test.yml`)
- [ ] GitHub Actions リリースワークフロー作成 (オプション - 将来対応)

### Milestone 3: 開発ツール整備 [COMPLETED]
- [x] (2026-01-21 21:59Z) Biome (Linter/Formatter) 導入
- [x] (2026-01-21 21:59Z) lint-staged + husky 導入

### Milestone 4: Dual Publishing対応 [COMPLETED]
- [x] (2026-01-21 21:59Z) tsup.config.ts でCJS出力追加
- [x] (2026-01-21 21:59Z) package.json exports 修正
- [x] (2026-01-21 21:59Z) sideEffects: false 追加

### Milestone 5: ドキュメント整備 [COMPLETED]
- [x] (2026-01-21 21:59Z) CONTRIBUTING.md 作成
- [x] (2026-01-21 21:59Z) CHANGELOG.md 作成
- [x] (2026-01-21 21:59Z) README.md バッジ追加

### Milestone 6: コミュニティ対応 [COMPLETED]
- [x] (2026-01-21 21:59Z) CODE_OF_CONDUCT.md 作成
- [x] (2026-01-21 21:59Z) SECURITY.md 作成
- [x] (2026-01-21 21:59Z) .github/ISSUE_TEMPLATE/ 作成
- [x] (2026-01-21 21:59Z) .github/PULL_REQUEST_TEMPLATE.md 作成

---

## Code Review 指摘詳細

### CRITICAL: Projector.subscribe の非同期エラー黙殺

**ファイル**: `src/core/projector.ts`
**問題**: `this.handle()` の Promise を返していないため、EventBus のエラーハンドリングに乗らない

**修正案**:
```typescript
// Before
bus.on(eventType, (event) => {
  this.handle(event as TEvent);
});

// After
bus.on(eventType, (event) => {
  return this.handle(event as TEvent);
});
```

### MAJOR: EventBus の同期例外処理

**ファイル**: `src/core/event-bus.ts`
**問題**: handler が同期的に throw した場合、`instanceof Promise` 判定に到達せずエラー処理が行われない

**修正案**:
```typescript
const listener = (e: Event) => {
  const event = /* ... */;
  try {
    Promise.resolve(handler(event)).catch((error) => {
      this.handleError(error, event, options?.onError);
    });
  } catch (error) {
    this.handleError(error, event, options?.onError);
  }
};
```

### MAJOR: Engine.snapshot のパフォーマンス最適化

**ファイル**: `src/core/engine.ts`
**問題**: 既存スナップショットがあっても全イベントを再読込

**修正案**:
```typescript
const snapshot = this.snapshotStore ? await this.snapshotStore.load(streamId) : undefined;
const fromVersion = snapshot?.version ?? 0;
const baseState = snapshot?.state ?? this.config.initialState;
const events = await this.eventStore.readStream(streamId, fromVersion);
const state = events.reduce(this.config.reducer, baseState);
const version = fromVersion + events.length;
```

---

## Validation and Acceptance

### 受け入れ条件

1. **コード品質**
   - [x] Code Review の Critical/Major issues が修正済み
   - [x] `pnpm test` が全てパス (79 tests passed)
   - [x] `pnpm lint` がエラーなく完了 (14 warnings, 0 errors)

2. **必須ファイル**
   - [x] `LICENSE` ファイルが存在
   - [ ] `npm publish --dry-run` がエラーなく完了 (GitHubリポジトリ確定後に確認)

3. **CI/CD**
   - [x] PRを作成するとGitHub Actionsでテストが自動実行される (.github/workflows/test.yml 作成済み)
   - [x] Node.js 20/22 両方でテストがパス (マトリックスビルド設定済み)

4. **Dual Publishing**
   - [x] `dist/index.js` (ESM) が生成される (11.18 KB)
   - [x] `dist/index.cjs` (CJS) が生成される (12.73 KB)

5. **ドキュメント**
   - [x] READMEにCIバッジが表示される
   - [x] CONTRIBUTING.mdが存在する

---

## 将来の拡張計画 (v0.5.0+)

### Contract-First 強化
- [ ] `defineEvent` に Zod/TypeBox スキーマオプション追加
- [ ] イベントバージョニング (`version` フィールド) サポート
- [ ] Upcaster インターフェース（古いイベント形式の変換）

### AI協調対応
- [ ] イベントメタデータに `agentId`, `intent` 追加オプション
- [ ] OpenAPI/AsyncAPI 定義の自動生成

### ミドルウェア機構
- [ ] Engine.execute の前後にフック挿入
- [ ] ロギング、トレーサビリティ、権限チェック

---

## 未確定事項（要確認）

1. **GitHubリポジトリURL** - 後で提供
2. **著作者名** - 後で提供
3. **npmパッケージ名** - `rise` が取得可能か確認が必要（既に使用されている可能性）
