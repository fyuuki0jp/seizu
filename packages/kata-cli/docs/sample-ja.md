# カート管理 仕様書

> ショッピングカートドメインのContract仕様

## 目次

- **cart.addItem** - カートにアイテムを追加する （事前条件: 2件, テスト: 3件）
- **cart.create** - カートを作成する （事前条件: 1件, テスト: 2件）
- **cart.removeItem** （事前条件: 2件, テスト: 3件）

---

## cart.addItem - カートにアイテムを追加する

カートが存在し、アイテムが重複していない場合にのみ
新しいアイテムを追加できる。

| 項目 | 型 |
|------|-----|
| 状態 (State) | `CartState` |
| 入力 (Input) | `{ itemId: string; qty: number; price: number }` |
| エラー (Error) | `CartNotFound | DuplicateItem` |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | カートが存在していること | `CartNotFound` |
| 2 | 同じアイテムが既にカートに存在していないこと | `DuplicateItem` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | アイテム数が1つ増加する |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

| # | 条件 |
|---|------|
| 1 | すべてのアイテムの数量が正の値である |

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `CartNotFound` | 事前条件 #1 |
| `DuplicateItem` | 事前条件 #2 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | adds item to existing cart | 正常に処理される |
| 2 | returns CartNotFound when cart does not exist | エラー: `CartNotFound` |
| 3 | returns DuplicateItem when item already exists | エラー: `DuplicateItem` |

---

## cart.create - カートを作成する

新しいショッピングカートを作成する。
既にカートが存在する場合はエラーを返す。

| 項目 | 型 |
|------|-----|
| 状態 (State) | `CartState` |
| 入力 (Input) | `{ userId: string }` |
| エラー (Error) | `AlreadyExists` |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | カートがまだ存在していないこと | `AlreadyExists` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

_定義なし_

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `AlreadyExists` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | creates a cart when it does not exist | 正常に処理される |
| 2 | returns AlreadyExists when cart exists | エラー: `AlreadyExists` |

---

## cart.removeItem

| 項目 | 型 |
|------|-----|
| 状態 (State) | `CartState` |
| 入力 (Input) | `{ itemId: string }` |
| エラー (Error) | `CartNotFound | ItemNotFound` |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | _説明なし（TSDocコメントを追加してください）_ | `CartNotFound` |
| 2 | _説明なし（TSDocコメントを追加してください）_ | `ItemNotFound` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | _説明なし（TSDocコメントを追加してください）_ |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `CartNotFound` | 事前条件 #1 |
| `ItemNotFound` | 事前条件 #2 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | removes item from cart | 正常に処理される |
| 2 | returns CartNotFound when cart does not exist | エラー: `CartNotFound` |
| 3 | returns ItemNotFound when item does not exist | エラー: `ItemNotFound` |

---

## テスト網羅性

> 各Contractに対するテストの網羅状況です。

| Contract | テスト数 | エラータグ網羅 | 状態 |
|----------|-------|---------------|--------|
| cart.create | 2 | 1/1 | テスト済 |
| cart.addItem | 3 | 2/2 | テスト済 |
| cart.removeItem | 3 | 2/2 | テスト済 |

Contract網羅率: 3/3 (100.0%)
エラータグ網羅率: 5/5 (100.0%)
