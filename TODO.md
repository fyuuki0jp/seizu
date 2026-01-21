# RISE TODO

## 概要

このドキュメントは RISE ライブラリの改善点と将来の方針をまとめたものです。

---

## High Priority（バグ/安定性）

### 1. EventBus の同期例外ハンドリング
- **問題**: `handler` 内で同期例外が投げられると、`onError` が実行されずバスが落ちる可能性
- **対応**: try-catch で同期例外も捕捉し、エラーハンドリングを統一

### 2. Projector.subscribe の Promise rejection 捕捉
- **問題**: `this.handle(event)` を await していないため、失敗時に未処理になる
- **対応**: Promise rejection を適切に捕捉する

### 3. ID 生成器の DI 対応
- **問題**: `crypto.randomUUID()` が環境依存（Node.js 18 で問題の可能性）
- **対応**: `IdGenerator` を DI できるようにする
- **設計**:
  ```typescript
  type IdGenerator = () => string;
  
  interface EngineOptions {
    idGenerator?: IdGenerator;  // デフォルト: crypto.randomUUID()
  }
  
  // 使用例
  const engine = new Engine(store, config, {
    idGenerator: () => ulid(),
  });
  ```
- **メリット**:
  - 環境依存の解消
  - テスト時に固定 ID を注入可能
  - UUID, ULID, nanoid など自由に選択可能

---

## Medium Priority（アーキテクチャ）

### 4. EventPublisher.publish を Promise<void> に変更
- **理由**: 将来の AWS EventBridge 等との連携を視野に
- **対応**: `publish(event: DomainEvent): void` → `Promise<void>`

### 5. Engine/EventBus のイベントラップ関数を共通化
- **問題**: `ensureMeta` / `wrapAsCustomEvent` が重複
- **対応**: `src/lib/events.ts` に共通ヘルパーとして抽出

### 6. Use Case 層向けのサンプル追加
- **目的**: クリーンアーキテクチャでの使い方を示す
- **内容**:
  - `examples/clean-arch/` を作成
  - Domain / Use Case / Infrastructure の分離を明示
  - EventBus から Use Case を呼ぶパターンを示す

---

## Low Priority（将来対応）

### 7. 複数ランタイムでの CI テスト
- **対象**: Node.js 18/20, Bun, Deno
- **目的**: 移植性の保証

### 8. CustomEvent ポリフィル
- **現状**: 現時点では不要（ほぼ全環境でサポート）
- **対応**: 問題が発生したら追加

---

## 設計方針

### 移植性（Hono のように「どこでも動く」を目指す）

| 方針 | 説明 |
|------|------|
| Web Standards API のみ使用 | `EventTarget`, `CustomEvent`, `crypto.randomUUID()` |
| ゼロ依存 | Node.js 固有 API を使わない |
| Lambda 対応は Hono に任せる | RISE は「ビジネスロジック層」に集中 |
| アダプターは別パッケージ | `@rise/adapter-dynamodb`, `@rise/adapter-eventbridge` など |

### クリーンアーキテクチャとの親和性

| レイヤー | RISE の役割 |
|----------|-------------|
| Domain | `DomainEvent`, `Result`, `reducer`, `decider`（純粋関数）|
| Use Case | `Engine`, `EventBus`, `Projector` を組み立て |
| Infrastructure | `EventStore`, `SnapshotStore`, `ProjectionStore` の実装 |

- **decider は純粋関数**: meta は Engine 側で付与
- **EventBus → Use Case**: 配線は Infrastructure 層が担当
- **Saga パターン**: 結果を待つ処理は Use Case 層で直接オーケストレーション

### EventBus の役割

| ケース | 推奨パターン |
|--------|-------------|
| 結果を待つ必要がある | Saga / Orchestrator（Use Case 層で直接呼び出し）|
| 結果を待たなくていい | EventBus（通知、分析、監査ログ）|
| 外部サービス連携（将来）| Publisher のみ抽象化、Subscriber はインフラ側 |

---

## 将来のパッケージ構成

```
packages/
├── rise/                          # コア（ゼロ依存、Web Standards のみ）
├── rise-adapter-dynamodb/         # DynamoDB EventStore
├── rise-adapter-postgres/         # PostgreSQL EventStore
├── rise-adapter-eventbridge/      # EventBridge Publisher
└── rise-adapter-redis/            # Redis SnapshotStore
```

---

## コードレビュー結果サマリー

### 総合評価: B

#### 良い点
- API 設計が一貫しており、責務分離が明確
- 型推論がよく効いている
- Snapshot / Projection の追加が API を崩さず拡張されている
- Aggregate（reducer/decider）を純粋関数として設計可能

#### 改善が必要な点
- EventBus/Projector の非同期エラーが未捕捉になるケースがある
- サンプルの一部で `!` に依存した安全でない遷移がある
- Use Case 層の責務分離がサンプルで不明確
