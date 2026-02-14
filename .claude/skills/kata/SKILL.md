---
name: kata
description: |
  kata (型) を使ってドメイン駆動設計のビジネスロジックを実装する。
  トリガー: "kata", "コントラクト", "ビジネスロジック", "ドメインモデル", "集約", "ユースケース"
  使用場面: (1) 集約のコマンドハンドラ実装、(2) ビジネスルールのガード定義、(3) ユースケースのシナリオ実装、(4) ドメイン不変条件の宣言と検証
---

# kata (型) — ドメインロジック実装ガイド

kata はドメイン駆動設計（DDD）のビジネスロジックを **コントラクト（事前条件・事後条件・不変条件）** として宣言的に記述し、Property-Based Testing で自動検証する TypeScript ライブラリ。

クリーンアーキテクチャの **ドメイン層（最内周）** に位置し、フレームワークやインフラに一切依存しない純粋なビジネスルールの表現に特化する。

## kata と DDD の対応関係

| DDD の概念 | kata の対応 |
|-----------|------------|
| 集約の状態 | `TState`（readonly plain object） |
| ドメインエラー | `TError`（tagged union） |
| コマンドハンドラ | `define()` で定義するコントラクト |
| ビジネスルール / ガード条件 | `pre`（事前条件の配列） |
| 状態遷移 / 集約の振る舞い | `transition` 関数 |
| ドメイン不変条件 | `invariant`（PBT で検証） |
| 事後条件の仕様 | `post`（PBT で検証） |
| ユースケース / ワークフロー | `scenario()` で組み立てるステップ列 |

## 基本原則

- **イミュータブル**: 集約の状態は `readonly` を徹底し、変換で新しい状態を返す
- **Railway Oriented**: すべての操作は `Result<T, E>` を返す。例外を投げない
- **関数指向**: plain object + pure function。副作用はドメイン層の外に押し出す
- **ゼロ依存**: ランタイム依存なし。ドメイン層の純粋性を保つ

## インポート

```typescript
// コア API
import { define, ok, err, pass, isOk, isErr, map, flatMap, match } from 'kata';
import type { Result, Contract, Guard, Condition, Invariant } from 'kata';

// ユースケース（シナリオ）API
import { scenario, step } from 'kata';
import type { Scenario, ScenarioFailure } from 'kata';

// テストヘルパー
import { expectOk, expectErr } from 'kata/testing';

// PBT 検証（fast-check 必要）
import { verify, verifyContract, assertContractValid } from 'kata/verify';
```

---

## 実装の流れ

### Step 1: 集約の状態を定義する

集約のライフサイクル全体を表現する readonly な plain object を定義する。

```typescript
type CartItem = { readonly qty: number; readonly price: number };

type CartState = {
  readonly exists: boolean;
  readonly userId?: string;
  readonly items: ReadonlyMap<string, CartItem>;
};

const emptyCart: CartState = { exists: false, items: new Map() };
```

### Step 2: ドメインエラーを定義する

ビジネスルール違反を tagged union で表現する。`tag` フィールドで判別可能にする。

```typescript
type AlreadyExists = { readonly tag: 'AlreadyExists' };
type CartNotFound = { readonly tag: 'CartNotFound' };
type DuplicateItem = { readonly tag: 'DuplicateItem'; readonly itemId: string };
type ItemNotFound = { readonly tag: 'ItemNotFound'; readonly itemId: string };
```

### Step 3: コマンドハンドラをコントラクトとして宣言する

`define<TState, TInput, TError>(def)` で集約に対するコマンドを宣言する。
返り値は **呼び出し可能な関数 + メタデータ** になる。

```typescript
const createCart = define<CartState, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  pre: [
    (s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const })),
  ],
  transition: (state, input) => ({
    ...state,
    exists: true,
    userId: input.userId,
  }),
});
```

#### define() の構造

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | Yes | コントラクトの識別子。`集約名.コマンド名` 形式 |
| `pre` | Yes | ビジネスルール（ガード）の配列。`pass` で成功、`err()` で違反。先頭から評価し fail-fast |
| `transition` | Yes | 状態遷移の純粋関数 `(state, input) => newState` |
| `post` | No | 事後条件 `(before, after, input) => boolean`。PBT でのみ検証される |
| `invariant` | No | 集約の不変条件 `(state) => boolean`。PBT でのみ検証される |

#### ビジネスルール（ガード）の書き方

```typescript
pre: [
  // 集約の存在チェック
  (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const })),
  // 重複チェック（state + input の両方を参照）
  (s, i) => (!s.items.has(i.itemId)
    ? pass
    : err({ tag: 'DuplicateItem' as const, itemId: i.itemId })),
]
```

- `pass` は `ok(undefined)` のエイリアス。ルール適合を示す
- `err({ tag: '...' })` でビジネスルール違反を返す
- タグリテラルには `as const` を付けて型を狭める
- 複数のガードは配列順に評価され、最初の違反で停止する

#### ドメイン不変条件と事後条件の宣言

```typescript
const addItem = define<CartState, AddItemInput, AddItemError>({
  id: 'cart.addItem',
  pre: [/* ビジネスルール */],
  transition: (state, input) => ({
    ...state,
    items: new Map([
      ...state.items,
      [input.itemId, { qty: input.qty, price: input.price }],
    ]),
  }),
  // 事後条件: 遷移前後の状態を比較する仕様
  post: [
    (before, after) => after.items.size === before.items.size + 1,
  ],
  // 不変条件: 集約が常に満たすべきルール
  invariant: [
    (s) => [...s.items.values()].every((i) => i.qty > 0),
  ],
});
```

**重要**: `post` と `invariant` はランタイムでは評価されない。`verify()` による PBT でのみ検証される仕様宣言。

### Step 4: コマンドを実行する

`define()` が返すコントラクトはそのまま関数として呼び出せる。

```typescript
const result = createCart(emptyCart, { userId: 'alice' });

if (isOk(result)) {
  const newState = result.value; // 遷移後の集約状態
}
if (isErr(result)) {
  const domainError = result.error; // { tag: 'AlreadyExists' }
}

// match でパターンマッチ
const message = match(result, {
  ok: (state) => `Cart created for ${state.userId}`,
  err: (e) => `Business rule violated: ${e.tag}`,
});
```

コントラクトはメタデータにもアクセスできる:

```typescript
createCart.id;         // 'cart.create'
createCart.pre;        // ガード関数の配列
createCart.transition; // 遷移関数
```

### Step 5: ユースケースを scenario() で組み立てる

複数のコマンドを順に実行するユースケースは `scenario()` で宣言する。
`define()` と同じく **呼び出し可能な関数 + メタデータ** を返す。

```typescript
type PurchaseInput = {
  userId: string;
  itemId: string;
  qty: number;
  price: number;
};

const purchase = scenario<CartState, PurchaseInput>({
  id: 'cart.purchase',
  description: '購入フロー',
  flow: (input) => [
    step(createCart, { userId: input.userId }),
    step(addItem, { itemId: input.itemId, qty: input.qty, price: input.price }),
  ],
});

// ユースケースの実行
const result = purchase(emptyCart, {
  userId: 'alice',
  itemId: 'apple',
  qty: 3,
  price: 1.5,
});
```

#### シナリオの動作

- 各ステップの出力 state が次のステップの入力 state になる（state threading）
- ビジネスルール違反が発生したステップで即座に停止（short-circuit）
- 成功時: 最終的な集約状態が `ok` で返る
- 失敗時: `{ stepIndex, contractId, error }` でどのステップのどのルールが違反したか特定できる

#### 入力に応じた動的ステップ生成

`flow` は関数なので、入力データに応じてステップ数を変えられる。

```typescript
type BulkInput = {
  userId: string;
  items: { id: string; qty: number; price: number }[];
};

const bulkPurchase = scenario<CartState, BulkInput>({
  id: 'cart.bulkPurchase',
  description: '一括購入フロー',
  flow: (input) => [
    step(createCart, { userId: input.userId }),
    ...input.items.map((item) =>
      step(addItem, { itemId: item.id, qty: item.qty, price: item.price })
    ),
  ],
});
```

### Step 6: テストを書く

#### ユニットテスト — コマンド単位の振る舞い検証

```typescript
import { describe, expect, test } from 'vitest';
import { expectOk, expectErr } from 'kata/testing';

describe('cart.create', () => {
  test('creates a cart when it does not exist', () => {
    const state = expectOk(createCart(emptyCart, { userId: 'alice' }));
    expect(state.exists).toBe(true);
    expect(state.userId).toBe('alice');
  });

  test('rejects when cart already exists', () => {
    const activeCart: CartState = { exists: true, items: new Map() };
    const error = expectErr(createCart(activeCart, { userId: 'alice' }));
    expect(error).toEqual({ tag: 'AlreadyExists' });
  });
});
```

- `expectOk(result)`: ok なら value を返す。err ならテスト失敗
- `expectErr(result)`: err なら error を返す。ok ならテスト失敗

#### PBT — 不変条件とビジネスルールの網羅検証

```typescript
import * as fc from 'fast-check';
import { assertContractValid } from 'kata/verify';

const stateArb = fc.record({
  exists: fc.boolean(),
  items: fc.constant(new Map()),
});
const inputArb = fc.record({
  userId: fc.string({ minLength: 1 }),
});

test('createCart satisfies all domain invariants', () => {
  assertContractValid(
    createCart,
    { state: stateArb, input: inputArb },
    { numRuns: 100 }
  );
});
```

PBT が検出するドメインロジックの欠陥:

| 違反 | 意味 |
|------|------|
| `pre_not_guarded` | ガードが違反を検出したのにコマンドが成功してしまう |
| `postcondition_failed` | 遷移後に事後条件が満たされない |
| `invariant_failed` | 遷移後に集約の不変条件が破れている |
| `unexpected_error` | 全ガードが通過したのにコマンドがエラーを返す |

---

## コード生成ルール

kata を使ったドメインロジックを書くとき、以下に従うこと:

1. **State は readonly plain object** — 集約の全ライフサイクルを1つの型で表現する
2. **Error は tagged union** — `{ readonly tag: 'ErrorName' }` 形式。文脈情報も含める
3. **1コントラクト = 1コマンド** — `define()` は単一のドメイン操作に対応させる
4. **id は `集約名.コマンド名` 形式** — `cart.create`, `order.submit` など
5. **ガードは `pass` / `err()` を返す** — boolean ではなく Result で表現
6. **タグリテラルには `as const`** — 型推論を正確にするため
7. **transition は純粋関数** — 副作用なし。スプレッド構文でイミュータブル更新
8. **post / invariant はドメイン仕様の宣言** — ランタイム検証ではなく PBT 用
9. **ユースケースは scenario() で組み立てる** — flow 関数で入力に応じた動的ステップ生成
10. **テストでは `expectOk` / `expectErr` を使う** — Result のアサーション
