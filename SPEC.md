# RISE v2 要件定義書

Version: 2.0.0-draft
Date: 2026-02-14

---

## 1. プロジェクト定義

### 1.1 一文定義

**RISE は、状態遷移関数に契約（事前条件・事後条件・不変条件）を宣言的に付与し、Property-Based Testing で自動検証するための TypeScript ライブラリ + CLI ツールである。**

### 1.2 解決する問題

TypeScript で DDD の状態遷移ロジックを書く際、以下の問題が発生する。

1. **ガード条件の重複**: 実行コード内の `if` チェックと、テスト・仕様書に記述される条件が別々に管理され、乖離する
2. **暗黙的な契約**: 「Cart は AddItem 前に存在していなければならない」等のビジネスルールが、コード内の `if` 文としてしか表現されない。発見・検証・文書化が困難
3. **テスト不足の検出困難**: 事前条件を満たさない入力に対して関数が `err` を返すべきなのに `ok` を返す（ガード漏れ）バグが、手書きテストでは網羅しきれない

### 1.3 解決方法

`define()` 関数で `{ pre, transition, post, invariant }` を一度だけ宣言すると、以下が得られる。

- **実行可能な関数**: `(state, input) => Result<State, Error>` として直接呼び出せる。ガードチェック → 遷移の合成は自動
- **検証可能なメタデータ**: 同一オブジェクトから `pre`, `post`, `invariant` を取り出し、rise-verify が PBT で自動検証する

### 1.4 スコープ外

以下は RISE v2 の責務外とする。

| スコープ外 | 理由 |
|-----------|------|
| Event Sourcing (EventStore, Reducer, Snapshot) | データ永続化は別の関心 |
| Pub/Sub / EventBus / Reactor | 副作用管理はユーザーの責務 |
| Projection / Read Model | 読み取りモデルは別の関心 |
| Input Validation (Schema) | Zod/Valibot 等の責務 |
| Builder pattern / 独自 DSL | AI 生成精度を下げる |
| Engine (オーケストレーション) | ユーザーのアプリケーション層の責務 |
| Schema アダプタパッケージ | ユーザーが数行で書ける |

---

## 2. パッケージ構成

2 パッケージのみ。

```
rise          ← ランタイムライブラリ（ゼロ依存）
rise-verify   ← PBT 検証 CLI（devDependency）
```

AI agent 向け Skills テンプレート（CLAUDE.md, AGENTS.md）は `npx rise-verify init` で生成する。独立パッケージにしない。

### 2.1 依存関係

```
rise (zero dependencies)
  ↑
rise-verify (fast-check, cac)
```

`rise` 本体はゼロ依存を維持する。PBT ランタイム（fast-check）、CLI フレームワーク（cac）は rise-verify 側に閉じる。

---

## 3. Package: `rise`

### 3.1 ファイル構成

```
rise/src/
├── result.ts     # Result 型 + ユーティリティ関数
├── types.ts      # Guard, Condition, Invariant, ContractDef, Contract 型定義
├── define.ts     # define() 関数
└── index.ts      # re-export
```

### 3.2 result.ts

#### 型定義

```typescript
export type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };
```

#### 提供する関数

| 関数 | シグネチャ | 説明 |
|------|----------|------|
| `ok` | `<T>(value: T) => Result<T, never>` | 成功値を生成 |
| `err` | `<E>(error: E) => Result<never, E>` | 失敗値を生成 |
| `isOk` | `<T, E>(r: Result<T, E>) => r is { ok: true; value: T }` | 成功判定（型ガード） |
| `isErr` | `<T, E>(r: Result<T, E>) => r is { ok: false; error: E }` | 失敗判定（型ガード） |
| `map` | `<T, U, E>(r: Result<T, E>, f: (v: T) => U) => Result<U, E>` | 成功値を変換 |
| `flatMap` | `<T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>) => Result<U, E>` | Result を返す関数を合成 |
| `match` | `<T, E, U>(r: Result<T, E>, h: { ok: (v: T) => U; err: (e: E) => U }) => U` | パターンマッチ |

#### 設計制約

- Plain Object 実装（`{ ok, value }` / `{ ok, error }`）。クラスにしない
- JSON.stringify 可能であること
- readonly で不変性を型レベルで保証

### 3.3 types.ts

#### Guard（事前条件）

```typescript
export interface Guard<TState, TInput, TError> {
  readonly id: string;
  readonly check: (state: TState, input: TInput) => boolean;
  readonly error: (state: TState, input: TInput) => TError;
}
```

- `check` が `true` を返す場合、この事前条件は満たされている
- `check` が `false` を返す場合、`error` が呼ばれ、`Result.Err` として返却される
- 1 つの `define()` に複数の Guard を配列で渡す。評価順序は配列順（先頭から順に評価、最初に false になった時点で短絡）

#### Condition（事後条件）

```typescript
export interface Condition<TState, TInput> {
  readonly id: string;
  readonly check: (before: TState, after: TState, input: TInput) => boolean;
}
```

- `transition` 実行前の状態 `before` と実行後の状態 `after` を受け取る
- `check` が `false` を返す場合、事後条件違反（rise-verify が検出する）
- ランタイムの `define()` 合成関数では評価されない（検証専用メタデータ）

#### Invariant（不変条件）

```typescript
export interface Invariant<TState> {
  readonly id: string;
  readonly check: (state: TState) => boolean;
}
```

- 全ての状態で常に `true` であるべき性質
- 遷移前・遷移後の両方で検証される（rise-verify が検出する）
- ランタイムの `define()` 合成関数では評価されない（検証専用メタデータ）

#### ContractDef（define の入力型）

```typescript
export interface ContractDef<TState, TInput, TError> {
  readonly id: string;
  readonly pre: ReadonlyArray<Guard<TState, TInput, TError>>;
  readonly transition: (state: TState, input: TInput) => TState;
  readonly post?: ReadonlyArray<Condition<TState, TInput>>;
  readonly invariant?: ReadonlyArray<Invariant<TState>>;
}
```

- `id`: 契約の一意識別子。名前空間ドット区切り推奨（例: `cart.addItem`）
- `pre`: 必須。事前条件の配列（空配列 `[]` も可）
- `transition`: 必須。ガードが全て通過した後に実行される純粋な状態遷移関数。失敗しない（Result を返さない）
- `post`: 任意。事後条件の配列
- `invariant`: 任意。不変条件の配列

#### Contract（define の出力型）

```typescript
export type Contract<TState, TInput, TError> =
  ((state: TState, input: TInput) => Result<TState, TError>) &
  ContractDef<TState, TInput, TError>;
```

- **関数として直接呼び出し可能**（`contract(state, input)` で `Result<TState, TError>` を返す）
- **メタデータとしてプロパティアクセス可能**（`contract.id`, `contract.pre`, `contract.post` 等）
- `Object.assign(fn, def)` パターンで実現する

### 3.4 define.ts

#### シグネチャ

```typescript
export function define<TState, TInput, TError>(
  def: ContractDef<TState, TInput, TError>,
): Contract<TState, TInput, TError>;
```

#### 振る舞い

呼び出し時（`contract(state, input)`）の実行フロー:

```
1. pre 配列を先頭から順に評価
   → guard.check(state, input) === false の場合:
     return err(guard.error(state, input))
   → 全て true の場合: 次へ
2. transition(state, input) を実行し、新しい state を得る
3. return ok(newState)
```

- `post` と `invariant` はランタイムでは評価しない
- `post` と `invariant` はメタデータとしてオブジェクトに保持される（rise-verify 用）

#### 実装

```typescript
export function define<TState, TInput, TError>(
  def: ContractDef<TState, TInput, TError>,
): Contract<TState, TInput, TError> {
  const execute = (state: TState, input: TInput): Result<TState, TError> => {
    for (const guard of def.pre) {
      if (!guard.check(state, input)) {
        return err(guard.error(state, input));
      }
    }
    return ok(def.transition(state, input));
  };
  return Object.assign(execute, def);
}
```

### 3.5 index.ts

```typescript
// Result
export { type Result, ok, err, isOk, isErr, map, flatMap, match } from './result';
// Types
export { type Guard, type Condition, type Invariant, type ContractDef, type Contract } from './types';
// Define
export { define } from './define';
```

Public API はこれで全て。

### 3.6 エラー型の規約

RISE はエラー型を強制しない。ユーザーが自由に定義する。推奨パターンは Discriminated Union:

```typescript
type CartNotFound = { readonly tag: 'CartNotFound' };
type DuplicateItem = { readonly tag: 'DuplicateItem'; readonly itemId: string };
type CartError = CartNotFound | DuplicateItem;
```

- `tag` フィールドでの判別を推奨（`_tag` や `type` でも可）
- Plain Object であること（クラスにしない）
- rise-verify の JSON reporter はエラーオブジェクトをそのまま出力する

---

## 4. Package: `rise-verify`

### 4.1 ファイル構成

```
rise-verify/src/
├── cli.ts          # CLI エントリポイント
├── config.ts       # 設定ファイルのロード・型定義
├── runner.ts       # fast-check 統合、検証ロジック
├── reporter/
│   ├── summary.ts  # デフォルト（人間向けテキスト）
│   ├── json.ts     # AI 向け構造化 JSON
│   └── replay.ts   # 再現スクリプト
└── index.ts        # Programmatic API（任意）
```

### 4.2 依存関係

| 依存 | 用途 |
|------|------|
| `rise` | Contract 型定義の参照 |
| `fast-check` | Property-Based Testing エンジン |
| `cac` | CLI フレームワーク |

### 4.3 CLI インターフェース

```bash
# 全契約検証
npx rise-verify

# 特定の契約を検証
npx rise-verify cart.addItem

# Reporter 指定
npx rise-verify --reporter=summary   # デフォルト
npx rise-verify --reporter=json      # AI 向け
npx rise-verify --reporter=replay    # 再現スクリプト

# PBT 実行回数
npx rise-verify --runs=1000          # デフォルト: 100

# ファイル監視
npx rise-verify --watch

# Skills テンプレート生成
npx rise-verify init
```

#### Exit Code

| Code | 意味 |
|------|------|
| 0 | 全契約 pass |
| 1 | violation 検出 |
| 2 | 設定/定義エラー（config ファイル未発見、型エラー等） |

### 4.4 設定ファイル

ファイル名: `rise-verify.config.ts`（プロジェクトルート）

```typescript
import type { Contract } from 'rise';
import type { Arbitrary } from 'fast-check';

export interface RiseVerifyConfig {
  contracts: ContractEntry[];
}

export interface ContractEntry {
  contract: Contract<any, any, any>;
  state: Arbitrary<any>;
  input: Arbitrary<any>;
}

// 例:
import fc from 'fast-check';
import { addItem, createCart } from './domain/cart';

export default {
  contracts: [
    {
      contract: createCart,
      state: fc.record({
        exists: fc.boolean(),
        items: fc.constant(new Map()),
      }),
      input: fc.record({
        userId: fc.string({ minLength: 1 }),
      }),
    },
    {
      contract: addItem,
      state: fc.record({
        exists: fc.boolean(),
        items: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.record({ qty: fc.integer({ min: 1, max: 100 }), price: fc.float({ min: 0 }) }),
        ).map((dict) => new Map(Object.entries(dict))),
      }),
      input: fc.record({
        itemId: fc.string({ minLength: 1, maxLength: 10 }),
        qty: fc.integer({ min: 1, max: 100 }),
        price: fc.float({ min: 0, max: 10000 }),
      }),
    },
  ],
} satisfies RiseVerifyConfig;
```

設計判断:
- Arbitrary はユーザーが fast-check を直接使って定義する
- Zod/Valibot からの自動変換はスコープ外（将来のユーティリティとして検討可）
- config ファイルで契約を明示的に列挙する（ファイル規約による自動検出はしない）

### 4.5 検証ロジック

各 ContractEntry に対して以下を実行する。

#### 4.5.1 事前条件の検証（Guard Completeness）

```
for each (state, input) generated by Arbitrary:
  evaluate all pre[i].check(state, input)
  
  if any pre[i].check returns false:
    execute contract(state, input)
    assert: result.ok === false
    if result.ok === true:
      → VIOLATION: "pre_not_guarded"
      → 事前条件が偽なのに execute が成功した = ガード漏れ
```

この検証は**最も重要**。ドメインロジックのガード不足を検出する。

#### 4.5.2 事後条件の検証（Postcondition Check）

```
for each (state, input) generated by Arbitrary:
  if all pre[i].check(state, input) === true:
    result = contract(state, input)
    assert: result.ok === true (pre が全て true なら成功するはず)
    if result.ok === true:
      for each post[j]:
        assert: post[j].check(state, result.value, input) === true
        if false:
          → VIOLATION: "postcondition_failed"
```

#### 4.5.3 不変条件の検証（Invariant Check）

```
for each (state, input) generated by Arbitrary:
  if all pre[i].check(state, input) === true:
    result = contract(state, input)
    if result.ok === true:
      for each invariant[k]:
        assert: invariant[k].check(result.value) === true
        if false:
          → VIOLATION: "invariant_failed"
```

#### 4.5.4 事前条件と実行結果の整合性（Guard Consistency）

```
for each (state, input) generated by Arbitrary:
  if all pre[i].check(state, input) === true:
    result = contract(state, input)
    assert: result.ok === true
    if result.ok === false:
      → VIOLATION: "unexpected_error"
      → 全 guard が true なのに execute が失敗 = transition 内部に隠れたガードがある
```

#### 4.5.5 Violation 種別一覧

| 種別 | 意味 | 重大度 |
|------|------|--------|
| `pre_not_guarded` | pre が false なのに execute が ok を返した | 高：ガード漏れバグ |
| `postcondition_failed` | 遷移後に事後条件が偽になった | 高：遷移ロジックバグ |
| `invariant_failed` | 遷移後に不変条件が偽になった | 高：不変条件違反 |
| `unexpected_error` | 全 pre が true なのに execute が err を返した | 中：隠れたガード |

### 4.6 Reporter: summary（デフォルト）

```
rise-verify

  cart.create
    pre
      ✓ cart.notExists          100 runs
    post
      (none)

  cart.addItem
    pre
      ✓ cart.exists             100 runs
      ✓ item.unique             100 runs
    post
      ✓ count.up                100 runs
    invariant
      ✗ qty.positive
        Counterexample:
          state = { exists: true, items: Map(0) {} }
          input = { itemId: "a", qty: 0, price: 5 }
        All preconditions passed, but invariant violated after transition.

  2 contracts, 6 checks, 5 passed, 1 failed
```

### 4.7 Reporter: json

```json
{
  "success": false,
  "results": [
    {
      "contractId": "cart.create",
      "checks": [
        { "id": "cart.notExists", "kind": "pre", "status": "passed", "runs": 100 }
      ]
    },
    {
      "contractId": "cart.addItem",
      "checks": [
        { "id": "cart.exists", "kind": "pre", "status": "passed", "runs": 100 },
        { "id": "item.unique", "kind": "pre", "status": "passed", "runs": 100 },
        { "id": "count.up", "kind": "post", "status": "passed", "runs": 100 },
        {
          "id": "qty.positive",
          "kind": "invariant",
          "status": "failed",
          "violation": "invariant_failed",
          "counterexample": {
            "state": { "exists": true, "items": [] },
            "input": { "itemId": "a", "qty": 0, "price": 5 }
          },
          "seed": 1234567890,
          "path": "0:1:3"
        }
      ]
    }
  ],
  "summary": {
    "contracts": 2,
    "checks": 6,
    "passed": 5,
    "failed": 1
  }
}
```

### 4.8 Reporter: replay

```
⚠ INVARIANT VIOLATION: cart.addItem > qty.positive

All preconditions passed, but invariant "qty.positive" is false
after transition.

  import { addItem } from './domain/cart';

  const state = { exists: true, items: new Map() };
  const input = { itemId: "a", qty: 0, price: 5 };

  const result = addItem(state, input);
  // result.ok === true
  // result.value.items.get("a") => { qty: 0, price: 5 }
  //
  // Invariant "qty.positive" expects:
  //   [...items.values()].every(item => item.qty > 0)
  //
  // Fix: Add a precondition guard for qty > 0, or adjust the
  //      invariant if qty === 0 is a valid state.

  Reproduce: npx rise-verify --seed 1234567890 --path "0:1:3"
```

### 4.9 `rise-verify init` コマンド

プロジェクトルートに以下を生成する。

| ファイル | 内容 |
|---------|------|
| `rise-verify.config.ts` | 空のテンプレート |
| `CLAUDE.md`（または既存ファイルに追記） | rise + rise-verify の使い方、contract パターン、CLI コマンド |
| `AGENTS.md`（または既存ファイルに追記） | 同上（Codex 向け） |

既存ファイルがある場合は上書きせず、追記セクションを提案する。

---

## 5. ユーザーコード例

### 5.1 ドメイン定義（Cart）

```typescript
// domain/cart.ts
import { define, type Result } from 'rise';

// --- State ---
type CartItem = { readonly qty: number; readonly price: number };

type CartState = {
  readonly exists: boolean;
  readonly items: ReadonlyMap<string, CartItem>;
};

// --- Errors ---
type AlreadyExists = { readonly tag: 'AlreadyExists' };
type CartNotFound  = { readonly tag: 'CartNotFound' };
type DuplicateItem = { readonly tag: 'DuplicateItem'; readonly itemId: string };
type ItemNotFound  = { readonly tag: 'ItemNotFound';  readonly itemId: string };

// --- Contracts ---
export const createCart = define<CartState, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  pre: [
    {
      id: 'cart.notExists',
      check: (state) => !state.exists,
      error: () => ({ tag: 'AlreadyExists' }),
    },
  ],
  transition: (state) => ({ ...state, exists: true }),
});

export const addItem = define<
  CartState,
  { itemId: string; qty: number; price: number },
  CartNotFound | DuplicateItem
>({
  id: 'cart.addItem',
  pre: [
    {
      id: 'cart.exists',
      check: (state) => state.exists,
      error: () => ({ tag: 'CartNotFound' }),
    },
    {
      id: 'item.unique',
      check: (state, input) => !state.items.has(input.itemId),
      error: (_, input) => ({ tag: 'DuplicateItem', itemId: input.itemId }),
    },
  ],
  transition: (state, input) => ({
    ...state,
    items: new Map([
      ...state.items,
      [input.itemId, { qty: input.qty, price: input.price }],
    ]),
  }),
  post: [
    {
      id: 'count.up',
      check: (before, after) => after.items.size === before.items.size + 1,
    },
  ],
  invariant: [
    {
      id: 'qty.positive',
      check: (state) => [...state.items.values()].every((i) => i.qty > 0),
    },
  ],
});

export const removeItem = define<
  CartState,
  { itemId: string },
  CartNotFound | ItemNotFound
>({
  id: 'cart.removeItem',
  pre: [
    {
      id: 'cart.exists',
      check: (state) => state.exists,
      error: () => ({ tag: 'CartNotFound' }),
    },
    {
      id: 'item.exists',
      check: (state, input) => state.items.has(input.itemId),
      error: (_, input) => ({ tag: 'ItemNotFound', itemId: input.itemId }),
    },
  ],
  transition: (state, input) => {
    const items = new Map(state.items);
    items.delete(input.itemId);
    return { ...state, items };
  },
  post: [
    {
      id: 'count.down',
      check: (before, after) => after.items.size === before.items.size - 1,
    },
  ],
});
```

### 5.2 アプリケーションコード

```typescript
// main.ts
import { isOk } from 'rise';
import { createCart, addItem } from './domain/cart';

let state = { exists: false, items: new Map() };

const r1 = createCart(state, { userId: 'alice' });
if (isOk(r1)) state = r1.value;

const r2 = addItem(state, { itemId: 'apple', qty: 3, price: 1.5 });
if (isOk(r2)) state = r2.value;

const r3 = addItem(state, { itemId: 'apple', qty: 1, price: 1.5 });
// r3 = { ok: false, error: { tag: 'DuplicateItem', itemId: 'apple' } }
```

### 5.3 検証設定

```typescript
// rise-verify.config.ts
import fc from 'fast-check';
import { addItem, createCart, removeItem } from './domain/cart';
import type { RiseVerifyConfig } from 'rise-verify';

const cartState = fc.record({
  exists: fc.boolean(),
  items: fc
    .array(
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.record({
          qty: fc.integer({ min: 1, max: 100 }),
          price: fc.float({ min: 0.01, max: 10000 }),
        }),
      ),
    )
    .map((entries) => new Map(entries)),
});

export default {
  contracts: [
    {
      contract: createCart,
      state: cartState,
      input: fc.record({ userId: fc.string({ minLength: 1 }) }),
    },
    {
      contract: addItem,
      state: cartState,
      input: fc.record({
        itemId: fc.string({ minLength: 1, maxLength: 10 }),
        qty: fc.integer({ min: 1, max: 100 }),
        price: fc.float({ min: 0.01, max: 10000 }),
      }),
    },
    {
      contract: removeItem,
      state: cartState,
      input: fc.record({
        itemId: fc.string({ minLength: 1, maxLength: 10 }),
      }),
    },
  ],
} satisfies RiseVerifyConfig;
```

---

## 6. ビルド・テスト構成

### 6.1 モノレポ構成

```
rise/                          # リポジトリルート
├── packages/
│   ├── rise/                  # コアライブラリ
│   │   ├── src/
│   │   │   ├── result.ts
│   │   │   ├── types.ts
│   │   │   ├── define.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── result.test.ts
│   │   │   ├── define.test.ts
│   │   │   └── cart.test.ts   # 統合テスト（Cart example）
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── rise-verify/           # CLI ツール
│       ├── src/
│       │   ├── cli.ts
│       │   ├── config.ts
│       │   ├── runner.ts
│       │   └── reporter/
│       │       ├── summary.ts
│       │       ├── json.ts
│       │       └── replay.ts
│       ├── tests/
│       │   ├── runner.test.ts
│       │   └── reporter.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── examples/
│   └── cart/                  # Cart example（完全なサンプル）
│       ├── domain/
│       │   └── cart.ts
│       ├── main.ts
│       └── rise-verify.config.ts
│
├── package.json               # ワークスペースルート
├── pnpm-workspace.yaml
├── biome.json
└── turbo.json
```

### 6.2 ツールチェイン

| ツール | 用途 |
|--------|------|
| pnpm | パッケージマネージャ + ワークスペース |
| tsup | ビルド（ESM + CJS） |
| vitest | テスト |
| biome | lint + format |
| turbo | モノレポタスクランナー |

### 6.3 npm パッケージ設定

#### `rise` の package.json

```json
{
  "name": "rise",
  "version": "2.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "dependencies": {}
}
```

#### `rise-verify` の package.json

```json
{
  "name": "rise-verify",
  "version": "2.0.0",
  "type": "module",
  "bin": {
    "rise-verify": "./dist/cli.mjs"
  },
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "rise": "workspace:*",
    "fast-check": "^3.x",
    "cac": "^6.x"
  }
}
```

---

## 7. テスト方針

### 7.1 `rise` パッケージのテスト

#### result.test.ts

- `ok(value)` → `{ ok: true, value }`
- `err(error)` → `{ ok: false, error }`
- `isOk` / `isErr` の型ガード動作
- `map` / `flatMap` の ok/err 両パス
- `match` の ok/err 両パス

#### define.test.ts

- Guard が全て true → `ok(transition 結果)` を返す
- 先頭 Guard が false → 対応する `err` を返す
- 2 番目 Guard が false → 先頭は通過し、2 番目の `err` を返す（短絡評価）
- Guard 配列が空 → 常に `ok(transition 結果)` を返す
- 返り値が関数として呼び出せる（`contract(state, input)`）
- 返り値のプロパティアクセス（`contract.id`, `contract.pre`, `contract.post`, `contract.invariant`）
- `post` / `invariant` はランタイム実行時に評価されない

#### cart.test.ts（統合テスト）

- Cart example の全 contract が正常に動作すること
- `createCart` → 存在しない → ok、既存 → err
- `addItem` → 存在・ユニーク → ok、非存在 → err、重複 → err
- `removeItem` → 存在・アイテムあり → ok、アイテムなし → err

### 7.2 `rise-verify` パッケージのテスト

#### runner.test.ts

- `pre_not_guarded` の検出: pre が false なのに ok を返す contract を与えて検出できること
- `postcondition_failed` の検出: post.check が false になる transition を与えて検出できること
- `invariant_failed` の検出: invariant.check が false になる遷移を与えて検出できること
- `unexpected_error` の検出: 全 pre が true なのに err を返す contract を与えて検出できること
- 全 check pass: 正常な contract で violation ゼロであること

#### reporter.test.ts

- summary reporter: 出力フォーマットの検証
- json reporter: JSON.parse 可能かつスキーマ準拠の検証
- replay reporter: 出力に再現コードが含まれることの検証

---

## 8. 実装ロードマップ

### Phase 1: `rise` コアの実装

所要期間目安: 数日

| ステップ | 成果物 | 完了条件 |
|---------|--------|---------|
| 1-1 | `result.ts` + `result.test.ts` | 全関数のテスト pass |
| 1-2 | `types.ts` | Guard, Condition, Invariant, ContractDef, Contract 型定義 |
| 1-3 | `define.ts` + `define.test.ts` | define() のユニットテスト pass |
| 1-4 | `index.ts` | Public API export |
| 1-5 | Cart example + `cart.test.ts` | 統合テスト pass |
| 1-6 | ビルド設定 | `pnpm build` で ESM/CJS 生成 |

Phase 1 完了条件: **Cart example が `define()` で定義され、関数呼び出しで正常動作し、全テストが pass すること。**

### Phase 2: `rise-verify` CLI の実装

所要期間目安: 1-2 週間

| ステップ | 成果物 | 完了条件 |
|---------|--------|---------|
| 2-1 | `config.ts` | rise-verify.config.ts の読み込み・型定義 |
| 2-2 | `runner.ts` + `runner.test.ts` | 4 種の violation 検出テスト pass |
| 2-3 | `reporter/summary.ts` | 人間が読めるテキスト出力 |
| 2-4 | `reporter/json.ts` | JSON スキーマ準拠の出力 |
| 2-5 | `reporter/replay.ts` | 再現スクリプト出力 |
| 2-6 | `cli.ts` | `npx rise-verify` が動作 |
| 2-7 | Cart example の検証設定 | `npx rise-verify` で Cart example を検証できる |

Phase 2 完了条件: **Cart example に対して `npx rise-verify --reporter=json` を実行し、AI エージェントがその出力から修正箇所を特定して修正 → 再検証のループが回ること。**

### Phase 3: Skills テンプレート + ドキュメント

所要期間目安: 数日

| ステップ | 成果物 | 完了条件 |
|---------|--------|---------|
| 3-1 | `rise-verify init` コマンド | CLAUDE.md, AGENTS.md テンプレート生成 |
| 3-2 | README.md（rise） | パッケージの使い方ドキュメント |
| 3-3 | README.md（rise-verify） | CLI の使い方ドキュメント |

---

## 9. 設計原則

### 9.1 UNIX 哲学への準拠

| 原則 | 適用 |
|------|------|
| 一つのことをうまくやる | `rise` は契約付き状態遷移の定義のみ。`rise-verify` は検証のみ |
| プログラムを連携させる | CLI の exit code + JSON 出力で他ツールとパイプ可能 |
| テキストストリームをインターフェースにする | `--reporter=json` の出力を AI エージェントが消費 |

### 9.2 標準 TypeScript の徹底

| 方針 | 理由 |
|------|------|
| Builder pattern を使わない | AI の訓練データに少なく、生成精度が下がる |
| Plain Object + 関数のみ | AI が最も得意な出力形式 |
| Discriminated Union でエラー型 | TypeScript の標準パターン |
| 独自 DSL を作らない | 学習コスト発生、生成精度低下 |

### 9.3 ゼロ依存（`rise` パッケージ）

- `rise` パッケージは `dependencies: {}` を維持する
- `devDependencies` はビルド・テストツールのみ
- Node.js / Deno / Bun / ブラウザ全てで動作すること

### 9.4 ロックインゼロ

- ユーザーのドメインコードは標準 TypeScript の関数であり、`rise` を削除しても動く
- `rise` が提供する `Result` 型は自前実装で置換可能
- `define()` は `Object.assign(fn, def)` であり、ユーザーが自分で書いても同等の結果が得られる
