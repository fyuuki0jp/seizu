# Defensive Coding Policy

RISE の防御的コーディング方針を明文化したドキュメントです。

## 基本原則

### 1. 境界で検証、内部では信頼 (Validate at Boundaries, Trust Internally)

| レイヤー | 検証ルール | 実装方法 |
|----------|-----------|---------|
| **Public API（境界）** | 完全な検証、明確なエラーメッセージ | Input validation + Result<T, E> |
| **Internal（内部）** | caller を信頼、assertion のみ | TypeScript 型 + Fail Fast assertion |
| **Optional Features** | Guard clause + デフォルト値 | `??` operator, optional chaining |

**理由**: 
- 境界での検証は、外部からの不正な入力を防ぐ
- 内部での信頼は、冗長なチェックを排除し、パフォーマンスと可読性を向上
- 不変条件違反は開発者のミスであり、即座に検出すべき (Fail Fast)

---

## エラーハンドリング戦略

### エラー分類と対処法

| シナリオ | 戦略 | 実装方法 | 例 |
|----------|------|---------|-----|
| **不変条件違反** | Fail Fast (throw Error) | `if (!invariant) throw new Error(...)` | `originalEvent` 欠損 |
| **ビジネスルール違反** | Result<T, E> 返却 | `return err(new DomainError(...))` | カート未作成でのアイテム追加 |
| **オプショナル機能欠落** | Guard clause + デフォルト値 | `value ?? defaultValue` | Snapshot機能未設定時 |

### Fail Fast vs Result 型の使い分け

#### Fail Fast (throw Error)
- **使用場面**: プログラミングエラー（開発者のミス）
- **例**:
  - `originalEvent` プロパティが欠損
  - 型システムで防げない不変条件違反
  - 内部APIの誤用

```typescript
if (!customEvent.originalEvent) {
  throw new Error(
    `Event "${e.type}" was dispatched without originalEvent. ` +
    `This indicates a programming error.`
  );
}
```

#### Result 型 (ok/err)
- **使用場面**: ビジネスロジックエラー（期待される失敗）
- **例**:
  - ドメインルール違反
  - リソース未発見
  - 権限不足

```typescript
if (!state.exists) {
  return err(new CartNotFoundError(command.streamId));
}
```

---

## RISE コードベースにおける検証戦略

### Public API (境界での検証)

#### Engine.execute()
```typescript
async execute(command: TCommand): Promise<Result<TEvent[], TError>> {
  // ✅ Command は型で検証（型システムに委譲）
  // ✅ Decider で業務ルール検証（Result 型で返却）
  const decision = this.config.decider(command, state);
  if (!decision.ok) {
    return decision; // ビジネスエラーを伝播
  }
  // ...
}
```

**検証内容**:
- Command 型: TypeScript 型システムで保証
- Business rules: Decider 関数内で `Result<T, E>` として検証

#### EventBus.publish()
```typescript
publish(event: TEvent): void {
  // ✅ Event 型を TypeScript で検証
  // ✅ meta がなければ自動付与（Optional feature の例）
  const eventWithMeta = ensureMeta(event);
  // ...
}
```

**検証内容**:
- Event 型: TypeScript 型システムで保証
- `meta` フィールド: オプショナル、欠損時は自動生成

---

### Internal (内部での信頼)

#### wrapAsCustomEvent()
```typescript
export const wrapAsCustomEvent = <E extends DomainEvent>(
  event: E
): WrappedCustomEvent<E> => {
  const ce = new CustomEvent(event.type, { detail: event.data }) as WrappedCustomEvent<E>;
  ce.originalEvent = event; // ✅ INVARIANT: 常に設定
  return ce;
};
```

**不変条件 (Invariant)**:
- `wrapAsCustomEvent()` は **常に** `originalEvent` プロパティを設定する
- この関数は内部でのみ使用され、外部から直接呼び出されることはない
- この不変条件が守られている限り、リスナー側で `originalEvent` が欠損することはない

#### Engine.on() / EventBus.on()
```typescript
const listener = (e: Event) => {
  const customEvent = e as CustomEvent & { originalEvent?: DomainEvent };
  
  // ✅ Fail Fast: 不変条件違反を即座に検出
  if (!customEvent.originalEvent) {
    throw new Error(
      `Event "${e.type}" was dispatched without originalEvent. ` +
      `This indicates a programming error.`
    );
  }
  
  handler(customEvent.originalEvent as ToEventMap<TEvent>[K]);
};
```

**検証内容**:
- `originalEvent` が存在しない場合、プログラミングエラーとして即座に例外をスロー
- このエラーは、開発者が誤って `dispatchEvent()` を直接呼び出した場合に発生
- ユーザーは `Engine.execute()` または `EventBus.publish()` を使用すべき

---

### Optional Features (Guard clause)

#### Snapshot 機能
```typescript
const snapshotData = this.snapshotStore
  ? await this.snapshotStore.load(command.streamId)
  : undefined; // ✅ Guard clause

const fromVersion = snapshotData?.version ?? 0; // ✅ デフォルト値
const initialState = snapshotData?.state ?? this.config.initialState;
```

**検証内容**:
- `snapshotStore` が存在しない場合、`undefined` を返す
- オプショナルな機能であり、エラーではない

---

## Event Dispatch Contract (不変条件)

### 契約内容

1. **RISE が保証する不変条件**:
   - `wrapAsCustomEvent()` は **必ず** `originalEvent` プロパティを設定する
   - `Engine.execute()` と `EventBus.publish()` は内部で `wrapAsCustomEvent()` を使用する

2. **ユーザーが守るべき契約**:
   - イベントの dispatch は `Engine.execute()` または `EventBus.publish()` を通じて行う
   - **直接 `dispatchEvent()` を呼び出してはならない**

3. **契約違反時の動作**:
   - `originalEvent` が欠損した場合、**即座に Error をスロー** (Fail Fast)
   - エラーメッセージで契約違反を明示

### なぜフォールバックを削除したか

#### 以前のコード (Over-Validation)
```typescript
const event = customEvent.originalEvent ?? {
  type: e.type,
  data: (e as CustomEvent).detail,
};
```

**問題点**:
- `originalEvent` は不変条件であり、欠損は **プログラミングエラー**
- フォールバックで作成されるオブジェクトは `meta` フィールドが欠損（不完全）
- バグを隠蔽し、問題の発見を遅らせる

#### 新しいコード (Fail Fast)
```typescript
if (!customEvent.originalEvent) {
  throw new Error(
    `Event "${e.type}" was dispatched without originalEvent. ` +
    `This indicates a programming error.`
  );
}
```

**利点**:
- 契約違反を **即座に検出**
- 明確なエラーメッセージで問題箇所を特定
- 型安全性の向上（`WrappedCustomEvent` 型で保証）

---

## 型レベルでの不変条件保証

### WrappedCustomEvent 型

```typescript
export type WrappedCustomEvent<E extends DomainEvent> = CustomEvent<E['data']> & {
  originalEvent: E; // ✅ Optional ではない
};
```

**目的**:
- `wrapAsCustomEvent()` の戻り値として型レベルで `originalEvent` の存在を保証
- リスナー側で `originalEvent?` ではなく `originalEvent` として扱える（型安全）

**使用例**:
```typescript
export const wrapAsCustomEvent = <E extends DomainEvent>(
  event: E
): WrappedCustomEvent<E> => {
  const ce = new CustomEvent(event.type, { detail: event.data }) as WrappedCustomEvent<E>;
  ce.originalEvent = event; // 型が強制
  return ce;
};
```

---

## まとめ

| 原則 | 説明 | 実装 |
|------|------|------|
| **Validate at Boundaries** | 外部入力は境界で完全検証 | `execute()`, `publish()` |
| **Trust Internally** | 内部コードは caller を信頼 | 型システム + assertion |
| **Fail Fast** | 不変条件違反は即座にエラー | `throw new Error(...)` |
| **Result for Business Errors** | ビジネスエラーは Result 型 | `return err(...)` |
| **Type-Level Invariants** | 可能な限り型で保証 | `WrappedCustomEvent` |

この方針により、RISE は **堅牢性**、**可読性**、**パフォーマンス** のバランスを実現します。
