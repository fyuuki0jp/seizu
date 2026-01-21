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

### v0.5.0 の成果（TODO.md 対応完了）

**実装完了日**: 2026-01-21

**Git フロー**: GitHub Flow に従って実装
- Feature ブランチ: `feature/v0.5.0-todo-implementation`
- PR: https://github.com/fyuuki0jp/rise/pull/2
- Commits: 
  - `25415a5`: chore: update opencode.json
  - `df9b70e`: feat: implement TODO.md items (v0.5.0)

**主要機能追加**:
1. **ID生成器のDI対応**: テスト時の固定ID注入が可能に（環境非依存化）
2. **EventPublisher Promise化**: 非同期イベント発行（AWS EventBridge等）に対応可能に
3. **clean-archサンプル**: クリーンアーキテクチャでの使用方法を明示
4. **コード品質改善**: non-null assertion 除去、エラーハンドリングテスト追加

**テスト**: 77 → 78 tests に増加（全テストパス）

**技術的成果**:
- 後方互換性を維持しながら新機能を追加（デフォルト引数・Union型活用）
- onPublishError コールバックによる柔軟なエラーハンドリング
- import パス修正の自動化と検証プロセスの確立

**ドキュメント**:
- CHANGELOG.md に v0.5.0 エントリ追加
- README.md に clean-arch サンプル追加
- clean-arch/README.md でアーキテクチャパターンを解説
- package.json version を 0.5.0 に更新

**計画レビュープロセス**:
- plan-reviewer による2段階レビューで計画品質を向上
- Major/Minor問題を段階的に解決

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

---

# TODO.md 対応改修計画 (v0.5.0)

## Purpose / Big Picture

RISE ライブラリの TODO.md で指摘されている未対応課題と、コードレビューで発見された追加問題を解消する。

**ユーザーが得るもの:**
- 環境非依存の ID 生成（テスト時の固定 ID 注入が可能に）
- 非同期対応の EventPublisher（将来の外部サービス連携準備）
- クリーンアーキテクチャでの使用方法を示すサンプル
- より堅牢なサンプルコードとテスト

**確認方法:**
1. `pnpm test` が全て成功
2. `pnpm build` がエラーなし
3. 新サンプル `examples/clean-arch/` が実行可能
4. 既存サンプルが引き続き動作

---

## Progress (TODO.md 対応)

### Milestone 1: ID 生成器の DI 対応 [COMPLETED]
- [x] (2026-01-21 23:20Z) `IdGenerator` 型を定義 (`src/lib/events.ts` L5)
- [x] (2026-01-21 23:20Z) `defaultIdGenerator` を定義 (`src/lib/events.ts` L59-66)
- [x] (2026-01-21 23:20Z) `createMeta` にデフォルト引数として `idGenerator` を追加
- [x] (2026-01-21 23:20Z) `EngineOptions` に `idGenerator` オプションを追加 (`src/core/engine.ts`)
- [x] (2026-01-21 23:20Z) Engine 内で `idGenerator` を使用するように修正
- [x] (2026-01-21 23:20Z) `IdGenerator` 型と `defaultIdGenerator` を `src/index.ts` からエクスポート
- [x] (2026-01-21 23:20Z) テスト追加 (`tests/engine.test.ts`)

### Milestone 2: EventPublisher.publish の Promise 化 [COMPLETED]
- [x] (2026-01-21 23:19Z) `EventPublisher.publish` の戻り値を `void | Promise<void>` に変更 (`src/core/engine.ts` L36-38)
- [x] (2026-01-21 23:19Z) `EngineOptions` に `onPublishError` を追加
- [x] (2026-01-21 23:19Z) Engine で Promise の catch でエラーハンドリング実装
- [x] (2026-01-21 23:19Z) 型互換性テスト追加 (`tests/event-bus.test.ts`)
- [x] (2026-01-21 23:19Z) onPublishError のテスト追加 (`tests/engine.test.ts`)

### Milestone 3: clean-arch サンプル追加 [COMPLETED]
- [x] (2026-01-21 23:22Z) `examples/clean-arch/` ディレクトリ構造作成
- [x] (2026-01-21 23:22Z) Domain 層 (`domain/cart/`) の実装
- [x] (2026-01-21 23:22Z) Use Case 層 (`use-cases/`) の実装
- [x] (2026-01-21 23:22Z) Infrastructure 層 (`infrastructure/`) の実装
- [x] (2026-01-21 23:22Z) エントリポイント (`main.ts`) の実装
- [x] (2026-01-21 23:22Z) README.md 作成

### Milestone 4: 追加発見の問題修正 [COMPLETED]
- [x] (2026-01-21 23:23Z) `examples/projection-demo.ts` L109, L111 の non-null assertion を除去
- [x] (2026-01-21 23:23Z) `tests/projection.test.ts` に Projector エラーハンドリングテスト追加

### 最終検証 [COMPLETED]
- [x] (2026-01-21 23:24Z) 全テストパス (`pnpm test` - 78 tests passed)
- [x] (2026-01-21 23:24Z) ビルド成功 (`pnpm build`)
- [x] (2026-01-21 23:24Z) Lint パス (`pnpm lint`)
- [x] (2026-01-21 23:24Z) 全サンプル実行確認（counter, cart, clean-arch, snapshot-demo, projection-demo, order-flow, order-flow-saga）
- [x] (2026-01-21 23:25Z) README.md に clean-arch サンプルへのリンクを追加
- [x] (2026-01-21 23:25Z) TODO.md 削除

---

## Surprises & Discoveries (TODO.md 対応調査)

調査日: 2026-01-21

| TODO.md 項目 | 現状 | 対応必要性 |
|--------------|------|-----------|
| 1. EventBus の同期例外ハンドリング | ✅ 対応済み (`event-bus.ts` L78-84) | 不要 |
| 2. Projector.subscribe の Promise rejection 捕捉 | ✅ 対応済み (`projector.ts` L82-85) | 不要 |
| 3. ID 生成器の DI 対応 | ❌ 未対応 (`crypto.randomUUID()` 直書き) | **要対応** |
| 4. EventPublisher.publish を Promise<void> に変更 | ❌ 未対応 (`publish(): void`) | **要対応** |
| 5. イベントラップ関数の共通化 | ✅ 対応済み (`lib/events.ts` に集約済み) | 不要 |
| 6. Use Case 層向けのサンプル追加 | ❌ 未対応 (`examples/clean-arch/` 不在) | **要対応** |
| 7. 複数ランタイムでの CI テスト | ❌ 未対応 (Node.js 20/22 のみ) | スコープ外 |
| 8. CustomEvent ポリフィル | 保留 | 不要 |

**追加発見:**
- `examples/projection-demo.ts` L109 に `state.orderId!` の non-null assertion あり
- Projector のエラーハンドリングテストが不足

---

## Decision Log (TODO.md 対応)

| 日付 | 決定事項 | 理由 |
|------|---------|------|
| 2026-01-21 | ID 生成器は EngineOptions に追加 | TODO.md の提案通り、Engine 単位での制御が可能 |
| 2026-01-21 | EventPublisher.publish は void → Promise<void> に直接変更 | 戻り値の変更は上位互換、メジャーバージョンアップ不要 |
| 2026-01-21 | clean-arch サンプルは cart ベースでシンプルに | 理解しやすさを優先 |
| 2026-01-21 | Low Priority (CI 複数ランタイム) は今回のスコープ外 | 優先度に従う |

---

## Context and Orientation (TODO.md 対応)

### 関連ファイル

| ファイル | 役割 | 変更内容 |
|----------|------|---------|
| `src/core/engine.ts` | Engine 本体 | EngineOptions に idGenerator 追加、EventPublisher Promise 化 |
| `src/lib/events.ts` | イベントユーティリティ | createMeta に idGenerator パラメータ追加 |
| `src/index.ts` | 公開 API | IdGenerator 型のエクスポート追加 |
| `tests/engine.test.ts` | Engine テスト | idGenerator DI のテスト追加 |
| `tests/projection.test.ts` | Projector テスト | エラーハンドリングテスト追加 |
| `examples/projection-demo.ts` | Projection デモ | non-null assertion 修正 |
| `examples/clean-arch/` | 新規サンプル | 新規作成 |

### createMeta() 呼び出し箇所一覧

**影響分析結果**: 全ての呼び出しはデフォルト引数により影響なし（引数なしで呼び出し）

| ファイル | 呼び出し回数 | 備考 |
|----------|-------------|------|
| `src/lib/events.ts` | 2 | ensureMeta, defineEvent 内部 |
| `tests/events.test.ts` | 5 | テストケース |
| `tests/engine.test.ts` | 1 | テストデータ |
| `tests/event-bus.test.ts` | 2 | テストデータ |
| `tests/projection.test.ts` | 3 | テストデータ |
| `tests/snapshot.test.ts` | 1 | テストデータ |
| `tests/type-inference.test.ts` | 1 | テストデータ |
| `examples/counter.ts` | 2 | イベントファクトリ |
| `examples/cart/events.ts` | 3 | イベントファクトリ |
| `examples/projection-demo.ts` | 3 | イベントファクトリ |
| `examples/snapshot-demo.ts` | 1 | イベントファクトリ |
| `examples/order-flow/**/events.ts` | 8 | イベントファクトリ |
| `examples/order-flow-saga/**/events.ts` | 7 | イベントファクトリ |

**結論**: createMeta() へのデフォルト引数追加は後方互換。既存コードの変更不要。

### EventPublisher 影響範囲

| ファイル | 使用箇所 | 影響 |
|----------|---------|------|
| `src/core/engine.ts` L36-38 | インターフェース定義 | 変更対象 |
| `src/core/engine.ts` L47 | EngineOptions.bus 型 | 自動追従 |
| `src/core/engine.ts` L64 | private readonly bus | 自動追従 |
| `src/index.ts` L9 | re-export | 変更不要 |

**結論**: `void | Promise<void>` の Union 型により既存実装は影響なし。Engine 内の `this.bus?.publish(event)` は fire-and-forget のため await 不要。

### 用語定義

| 用語 | 定義 |
|------|------|
| IdGenerator | `() => string` 型の関数、イベント/メタの一意識別子生成 |
| EventPublisher | イベント発行インターフェース |
| Use Case 層 | ビジネスロジックのオーケストレーション層 |

---

## Plan of Work (TODO.md 対応)

### Milestone 1: ID 生成器の DI 対応

**目的:** crypto.randomUUID() への依存を解消し、テスト時の ID 固定を可能にする

**作業順序:**

1. ~~**型定義の追加** (`src/lib/events.ts`)~~ ✅ 完了済み
   - `IdGenerator` 型を定義: `type IdGenerator = () => string`
   - デフォルト実装を用意: `const defaultIdGenerator: IdGenerator = () => crypto.randomUUID()`

2. ~~**createMeta の拡張** (`src/lib/events.ts`)~~ ✅ 完了済み
   ```typescript
   // Before
   export const createMeta = (): EventMeta => ({
     id: crypto.randomUUID(),
     timestamp: Date.now(),
   });
   
   // After
   export const createMeta = (idGenerator: IdGenerator = defaultIdGenerator): EventMeta => ({
     id: idGenerator(),
     timestamp: Date.now(),
   });
   ```

3. **EngineOptions の拡張** (`src/core/engine.ts`) ⬜ 未着手
   ```typescript
   export interface EngineOptions<TState = unknown> {
     bus?: EventPublisher;
     snapshotStore?: SnapshotStore<TState>;
     snapshotEvery?: number;
     idGenerator?: IdGenerator;  // 追加
   }
   ```

4. **Engine の修正** (`src/core/engine.ts`) ⬜ 未着手
   - constructor で idGenerator を受け取り private フィールドに保持
   - ensureMeta 呼び出し箇所で idGenerator を渡す

5. **エクスポートの追加** (`src/index.ts`) ⬜ 未着手
   - `IdGenerator` 型をエクスポート
   - `defaultIdGenerator` をエクスポート

6. **テスト追加** (`tests/engine.test.ts`) ⬜ 未着手
   ```typescript
   test('uses custom idGenerator when provided', async () => {
     let counter = 0;
     const customIdGenerator = () => `custom-id-${++counter}`;
     const engine = new Engine(store, config, { idGenerator: customIdGenerator });
     
     const result = await engine.execute(command);
     expect(result.ok).toBe(true);
     if (result.ok) {
       expect(result.value[0].meta?.id).toBe('custom-id-1');
     }
   });
   ```

**検証:**
- `pnpm test` が成功
- 既存テストが引き続きパス（デフォルト動作が維持されている）

---

### Milestone 2: EventPublisher.publish の Promise 化

**目的:** 将来の非同期イベント発行（AWS EventBridge 等）に対応可能にする

**設計方針:** Promise が reject された場合、`onPublishError` コールバックでユーザーがハンドリング可能にする

**作業順序:**

1. **インターフェース変更** (`src/core/engine.ts`)
   ```typescript
   // Before (L36-38)
   export interface EventPublisher {
     publish(event: DomainEvent): void;
   }
   
   // After
   export interface EventPublisher {
     publish(event: DomainEvent): void | Promise<void>;
   }
   ```

2. **EngineOptions に onPublishError を追加** (`src/core/engine.ts`)
   ```typescript
   export interface EngineOptions<TState = unknown> {
     bus?: EventPublisher;
     snapshotStore?: SnapshotStore<TState>;
     snapshotEvery?: number;
     idGenerator?: IdGenerator;
     onPublishError?: (error: unknown, event: DomainEvent) => void;  // 追加
   }
   ```

3. **Engine の publish 呼び出しを修正** (`src/core/engine.ts`)
   ```typescript
   // Before
   this.bus?.publish(event);
   
   // After
   const result = this.bus?.publish(event);
   if (result instanceof Promise) {
     result.catch((error) => {
       this.onPublishError?.(error, event);
     });
   }
   ```
   - `onPublishError` が未設定の場合は reject を黙殺（従来互換）
   - Promise は await しない（fire-and-forget パターン維持）

4. **EventBus.publish の確認** (`src/core/event-bus.ts`)
   - 現在の `publish` メソッドは `void` を返している
   - 型定義のみ変更、実装の変更は不要（`void` は `void | Promise<void>` を満たす）

5. **型互換性テスト追加** (`tests/event-bus.test.ts`)
   ```typescript
   import { expectTypeOf } from 'vitest';
   
   describe('EventPublisher interface', () => {
     test('sync publish implementation satisfies interface', () => {
       const syncPublisher: EventPublisher = {
         publish: (_event) => { /* sync */ },
       };
       expectTypeOf(syncPublisher).toMatchTypeOf<EventPublisher>();
     });
   
     test('async publish implementation satisfies interface', () => {
       const asyncPublisher: EventPublisher = {
         publish: async (_event) => { await Promise.resolve(); },
       };
       expectTypeOf(asyncPublisher).toMatchTypeOf<EventPublisher>();
     });
   });
   ```

6. **onPublishError のテスト追加** (`tests/engine.test.ts`)
   ```typescript
   test('onPublishError is called when async publish rejects', async () => {
     const errors: unknown[] = [];
     const asyncBus: EventPublisher = {
       publish: async () => { throw new Error('Publish failed'); },
     };
     const engine = new Engine(store, config, {
       bus: asyncBus,
       onPublishError: (err, _event) => errors.push(err),
     });
     
     await engine.execute(command);
     await new Promise((r) => setTimeout(r, 10)); // 非同期待ち
     
     expect(errors).toHaveLength(1);
     expect((errors[0] as Error).message).toBe('Publish failed');
   });
   ```

**影響範囲の確認**:

| ファイル | 使用箇所 | 影響 |
|----------|---------|------|
| `src/core/engine.ts` L36-38 | インターフェース定義 | 変更対象 |
| `src/core/engine.ts` L43-52 | `EngineOptions` | `onPublishError` 追加 |
| `src/core/engine.ts` L64 | `private readonly bus?: EventPublisher` | 自動追従 |
| `src/core/engine.ts` L130付近 | `this.bus?.publish(event)` | Promise catch 追加 |
| `src/index.ts` L9 | `type EventPublisher` re-export | 変更不要 |
| `src/core/event-bus.ts` | `EventBus.publish(): void` | 変更不要（void は互換）|

**検証:**
- `pnpm test` が成功
- `pnpm build` が成功（型チェック含む）
- 既存の EventBus 利用箇所が影響を受けないこと
- `onPublishError` を設定しない場合も従来通り動作すること

---

### Milestone 3: clean-arch サンプル追加

**目的:** クリーンアーキテクチャでの RISE の使い方を示す

**作業順序:**

1. **ディレクトリ構造作成**
   ```
   examples/clean-arch/
   ├── domain/
   │   └── cart/
   │       ├── events.ts      # CartCreated, ItemAdded 等
   │       ├── commands.ts    # CreateCart, AddItem 等
   │       ├── errors.ts      # CartNotFoundError 等
   │       ├── state.ts       # CartState, reducer
   │       ├── decider.ts     # decider 関数
   │       └── index.ts       # 再エクスポート
   ├── use-cases/
   │   ├── create-cart.ts     # CreateCartUseCase
   │   ├── add-item.ts        # AddItemUseCase
   │   └── index.ts           # エクスポート
   ├── infrastructure/
   │   └── setup.ts           # Engine, EventStore の組み立て
   ├── main.ts                # エントリポイント
   └── README.md              # 説明ドキュメント
   ```

2. **Domain 層** (`examples/clean-arch/domain/cart/`)
   
   **コピー元と変更点:**
   | コピー元 | コピー先 | 変更内容 |
   |----------|---------|---------|
   | `examples/cart/events.ts` | `domain/cart/events.ts` | import パス更新 |
   | `examples/cart/commands.ts` | `domain/cart/commands.ts` | import パス更新 |
   | `examples/cart/errors.ts` | `domain/cart/errors.ts` | 変更なし（外部依存なし） |
   | `examples/cart/state.ts` | `domain/cart/state.ts` | 変更なし（ローカル import のみ） |
   | `examples/cart/decider.ts` | `domain/cart/decider.ts` | import パス更新 |
   | (新規) | `domain/cart/index.ts` | 全モジュールの再エクスポート |

   **import パス変更一覧:**
   
   `domain/cart/events.ts`:
   ```typescript
   // before: import type { DomainEvent } from '../../src';
   // after:
   import type { DomainEvent } from '../../../../src';
   import { createMeta } from '../../../../src';
   ```
   
   `domain/cart/commands.ts`:
   ```typescript
   // before: import type { Command } from '../../src';
   // after:
   import type { Command } from '../../../../src';
   ```
   
   `domain/cart/decider.ts`:
   ```typescript
   // before: import { err, ok, type Result } from '../../src';
   // after:
   import { err, ok, type Result } from '../../../../src';
   // ローカル import は変更なし（同一ディレクトリ内）
   ```

   ```typescript
   // domain/cart/index.ts
   export * from './events';
   export * from './commands';
   export * from './errors';
   export * from './state';
   export * from './decider';
   ```

3. **Use Case 層** (`examples/clean-arch/use-cases/`)
   ```typescript
   // create-cart.ts
   import type { Result } from '../../../src';
   import type { Engine } from '../../../src';
   import type { CartCommand, CartEvent, CartState, CartError } from '../domain/cart';
   
   export class CreateCartUseCase {
     constructor(
       private readonly engine: Engine<CartCommand, CartEvent, CartState, CartError>
     ) {}
   
     async execute(cartId: string): Promise<Result<CartEvent[], CartError>> {
       return this.engine.execute({
         type: 'CreateCart',
         streamId: cartId,
       });
     }
   }
   
   // add-item.ts
   import type { Result } from '../../../src';
   import type { Engine } from '../../../src';
   import type { CartCommand, CartEvent, CartState, CartError } from '../domain/cart';
   
   export class AddItemUseCase {
     constructor(
       private readonly engine: Engine<CartCommand, CartEvent, CartState, CartError>
     ) {}
   
     async execute(
       cartId: string,
       itemId: string,
       quantity: number
     ): Promise<Result<CartEvent[], CartError>> {
       return this.engine.execute({
         type: 'AddItem',
         streamId: cartId,
         itemId,
         quantity,
       });
     }
   }
   
   // index.ts
   export { CreateCartUseCase } from './create-cart';
   export { AddItemUseCase } from './add-item';
   ```

4. **Infrastructure 層** (`examples/clean-arch/infrastructure/`)
   ```typescript
   // setup.ts
   import { Engine, InMemoryEventStore } from '../../../src';
   import { decider } from '../domain/cart/decider';
   import { reducer, initialState } from '../domain/cart/state';
   import type { CartCommand, CartEvent, CartState, CartError } from '../domain/cart';
   
   export const createCartEngine = (): Engine<CartCommand, CartEvent, CartState, CartError> => {
     const store = new InMemoryEventStore<CartEvent>();
     return new Engine(store, {
       decider,
       reducer,
       initialState,
     });
   };
   ```

5. **エントリポイント** (`examples/clean-arch/main.ts`)
   ```typescript
   import { createCartEngine } from './infrastructure/setup';
   import { CreateCartUseCase, AddItemUseCase } from './use-cases';
   
   const main = async () => {
     const engine = createCartEngine();
     const createCart = new CreateCartUseCase(engine);
     const addItem = new AddItemUseCase(engine);
   
     // Use Case 経由で操作
     const result = await createCart.execute('cart-1');
     console.log('Cart created:', result);
   
     if (result.ok) {
       const addResult = await addItem.execute('cart-1', 'item-1', 2);
       console.log('Item added:', addResult);
     }
   };
   
   main();
   ```

6. **README 追加** (`examples/clean-arch/README.md`)
   ```markdown
   # Clean Architecture Example
   
   RISE を使ったクリーンアーキテクチャの実装例です。
   
   ## ディレクトリ構成
   
   | ディレクトリ | 責務 |
   |-------------|------|
   | `domain/` | ビジネスロジック（純粋関数、型定義）|
   | `use-cases/` | アプリケーションサービス（オーケストレーション）|
   | `infrastructure/` | 技術的な詳細（Engine, EventStore の組み立て）|
   
   ## 実行方法
   
   ```bash
   pnpm tsx examples/clean-arch/main.ts
   ```
   
   ## ポイント
   
   - Domain 層は RISE への依存を最小限に（型のみ）
   - Use Case 層が Engine を操作、ビジネスフローを制御
   - Infrastructure 層が具体的な実装を提供
   ```

**検証:**
- `pnpm tsx examples/clean-arch/main.ts` が成功
- 期待出力:
  ```
  Cart created: { ok: true, value: [{ type: 'CartCreated', ... }] }
  Item added: { ok: true, value: [{ type: 'ItemAdded', ... }] }
  ```

---

### Milestone 4: 追加発見の問題修正

**目的:** コードレビューで発見された問題を修正

**作業順序:**

1. **non-null assertion 修正** (`examples/projection-demo.ts`)
   
   **現状のコード** (L101-113):
   ```typescript
   const decider = (
     command: OrderCommand,
     state: OrderState
   ): Result<OrderEvent[], Error> => {
     switch (command.type) {
       case 'PlaceOrder':
         return ok([orderPlaced(command.orderId, command.amount)]);
       case 'ConfirmOrder':
         return ok([orderConfirmed(state.orderId!)]);  // ← 問題箇所
       case 'CancelOrder':
         return ok([orderCancelled(state.orderId!)]);  // ← 問題箇所
     }
   };
   ```
   
   **修正後のコード**:
   ```typescript
   const decider = (
     command: OrderCommand,
     state: OrderState
   ): Result<OrderEvent[], Error> => {
     switch (command.type) {
       case 'PlaceOrder':
         return ok([orderPlaced(command.orderId, command.amount)]);
       case 'ConfirmOrder':
         if (!state.orderId) {
           return err(new Error('Order not found: orderId is null'));
         }
         return ok([orderConfirmed(state.orderId)]);
       case 'CancelOrder':
         if (!state.orderId) {
           return err(new Error('Order not found: orderId is null'));
         }
         return ok([orderCancelled(state.orderId)]);
     }
   };
   ```
   
   **備考**: 既存の `import { ok, err } from '../src';` が使用可能。新たなエラークラスは作成せず、標準の `Error` を使用（サンプルのシンプルさを維持）。

2. **Projector エラーハンドリングテスト追加** (`tests/projection.test.ts`)
   
   **現行 API に基づくテスト**:
   ```typescript
   import { describe, test, expect, beforeEach } from 'vitest';
   import { EventBus } from '../src/core/event-bus';
   import { Projector } from '../src/core/projector';
   import { InMemoryProjectionStore } from '../src/core/in-memory-projection-store';
   import { defineProjection } from '../src/lib/projections';
   import { createMeta } from '../src/lib/events';
   import type { DomainEvent } from '../src/lib/events';
   
   // テスト用イベント型
   type TestEvent = DomainEvent<'TestEvent', { id: string }>;
   
   const testEvent: TestEvent = {
     type: 'TestEvent',
     data: { id: 'test-1' },
     meta: createMeta(),
   };
   
   describe('Projector error handling', () => {
     test('handle error is propagated through EventBus onError', async () => {
       const bus = new EventBus<TestEvent>();
       const errors: unknown[] = [];
       
       // エラーを投げる projection
       const failingProjection = defineProjection<{ count: number }, TestEvent>(
         'failing',
         () => ({ count: 0 }),
         (_state, _event) => {
           throw new Error('Projection failed');
         }
       );
       
       const store = new InMemoryProjectionStore<{ count: number }>();
       const projector = new Projector(
         failingProjection,
         store,
         (event) => event.data.id
       );
       
       // EventBus に subscribe（onError は EventBus.on の第3引数で指定）
       bus.on('TestEvent', (event) => projector.handle(event), {
         onError: (e) => errors.push(e),
       });
       
       bus.publish(testEvent);
       
       // 非同期処理を待つ
       await new Promise((r) => setTimeout(r, 50));
       
       expect(errors).toHaveLength(1);
       expect(errors[0]).toBeInstanceOf(Error);
       expect((errors[0] as Error).message).toBe('Projection failed');
     });
   });
   ```
   
   **備考**: 
   - `Projector.subscribe` を使わず、`EventBus.on` + `projector.handle` の組み合わせでテスト
   - これにより EventBus のエラーハンドリング機構を直接検証
   - `Projector.subscribe` 経由のテストは、現行実装で `return this.handle()` しているため EventBus のエラーハンドラに伝播する

**検証:**
- `pnpm test` が成功
- `pnpm tsx examples/projection-demo.ts` がエラーなく実行
- `rg -n "\\w+!" examples/projection-demo.ts` の結果が空（non-null assertion が除去されていることを確認）

---

## Concrete Steps (TODO.md 対応)

### 実行コマンドと期待出力

```bash
# 1. 依存関係確認
pnpm install
# 期待: "Already up to date" または依存パッケージのインストール

# 2. 現状のテスト確認（変更前）
pnpm test
# 期待: 全テストがパス

# 3. 各 Milestone の実装後
pnpm test
# 期待: 全テストがパス（新規テスト含む）

# 4. ビルド確認
pnpm build
# 期待: エラーなし、dist/ に成果物生成

# 5. Lint 確認
pnpm lint
# 期待: エラーなし

# 6. 新サンプル実行
pnpm tsx examples/clean-arch/main.ts
# 期待: 
# Cart created: { ok: true, value: [...] }
# Item added: { ok: true, value: [...] }

# 7. 既存サンプル確認
pnpm tsx examples/counter.ts
pnpm tsx examples/cart/main.ts
pnpm tsx examples/projection-demo.ts
# 期待: 各サンプルがエラーなく実行

# 8. TODO.md の削除（全 Milestone 完了後）
rm TODO.md
git add -A
git commit -m "feat: implement TODO.md items (v0.5.0)"
# 期待: コミットが成功
```

---

## Validation and Acceptance (TODO.md 対応)

### 受け入れ条件

| # | 条件 | 検証方法 |
|---|------|---------|
| 1 | ID 生成器が DI 可能 | テストで固定 ID を注入し、`result.value[0].meta?.id` が注入した ID と一致することを確認 |
| 2 | EventPublisher.publish が Promise<void> を返せる | 同期・非同期両方の実装が `EventPublisher` インターフェースを満たすことをテストで確認 |
| 3 | clean-arch サンプルが実行可能 | `pnpm tsx examples/clean-arch/main.ts` を実行し、`Cart created:` と `Item added:` の出力を確認 |
| 4 | non-null assertion が除去されている | `rg -n "\\w+!" examples/projection-demo.ts` の結果が空であること |
| 5 | Projector のエラーテストが存在 | `pnpm vitest run -t "error handling"` でテストが実行されること |
| 6 | 全テストがパス | `pnpm test` の終了コードが 0 |
| 7 | ビルドが成功 | `pnpm build` の終了コードが 0、`dist/` にファイルが生成 |
| 8 | Lint がパス | `pnpm lint` の終了コードが 0 |

### 回帰テスト

既存の動作が維持されていることを確認:

```bash
# 既存サンプルの動作確認
pnpm tsx examples/counter.ts
pnpm tsx examples/cart/main.ts
pnpm tsx examples/projection-demo.ts
pnpm tsx examples/snapshot-demo.ts
pnpm tsx examples/order-flow/main.ts
pnpm tsx examples/order-flow-saga/main.ts

# 各コマンドがエラーなく完了すること
```

- EngineOptions を指定しない場合のデフォルト動作が維持
- EventBus の同期/非同期ハンドラーが正常動作

---

## リスクと対策 (TODO.md 対応)

| リスク | 影響 | 対策 |
|--------|------|------|
| EventPublisher の型変更が既存コードを壊す | 低 | `void \| Promise<void>` の Union 型で互換性維持 |
| createMeta の引数追加が呼び出し元に影響 | 低 | デフォルト引数により既存呼び出しは変更不要 |
| clean-arch サンプルが複雑になりすぎる | 中 | シンプルな cart ベースで最小構成を維持 |
| TODO.md 削除後に計画参照が必要になる | 低 | PLAN.md に Surprises & Discoveries として内容を保存済み |

### ロールバック手順

万が一問題が発生した場合:

```bash
# 変更を元に戻す
git checkout HEAD~1 -- .

# TODO.md のみを復元する場合
git checkout HEAD~1 -- TODO.md

# 特定ファイルのみロールバック
git checkout HEAD~1 -- src/core/engine.ts
```
