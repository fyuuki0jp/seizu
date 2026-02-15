# seizu-cli Contract Specification

> seizu-cli domain logic contracts — self-documenting dogfooding example

## Scenarios

> Business workflows composed from multiple contract operations.

### doc.generate

> `doc.generate`

### Acceptance Criteria

> Business requirements that this contract fulfills.

- ソースファイルからContract仕様書を自動生成できる

| # | Operation | Input |
|---|------|------|
| 1 | `doc.parse` | sourceFiles: input.sourceFiles |
| 2 | `doc.filter` | filterIds: input.filterIds |
| 3 | `doc.link` | - |
| 4 | `doc.analyze` | enabled: input.coverageEnabled |
| 5 | `doc.render` | - |

<!-- flow-hash: e2aa910ce0e8b6c8994bc92f6872b816f8d6ea26f7315b895eb86d20e89922c4 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step doc.parse"]
  n4["step doc.filter"]
  n5["step doc.link"]
  n6["step doc.analyze"]
  n7["step doc.render"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n6
  n6 --> n7
  n7 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 5 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### coverage.generate

> `coverage.generate`

### Acceptance Criteria

> Business requirements that this contract fulfills.

- テストカバレッジレポートを生成できる

| # | Operation | Input |
|---|------|------|
| 1 | `doc.parse` | sourceFiles: input.sourceFiles |
| 2 | `doc.filter` | filterIds: input.filterIds |
| 3 | `doc.link` | - |
| 4 | `doc.analyze` | enabled: true |

<!-- flow-hash: dc55991c965b071f2945f019362a697d104a6dde190695344657250eb7ca5424 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step doc.parse"]
  n4["step doc.filter"]
  n5["step doc.link"]
  n6["step doc.analyze"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n6
  n6 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 4 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### render.markdown

> `render.markdown`

### Acceptance Criteria

> Business requirements that this contract fulfills.

- タイトル・シナリオ・目次をMarkdownとして組み立てられる

| # | Operation | Input |
|---|------|------|
| 1 | `render.title` | title: input.title, description: input.description |
| 2 | `render.scenarioSection` | scenarios: input.scenarios, messages: input.messages, flowEnabled: input.flowEnabled |
| 3 | `render.toc` | contracts: [...input.contracts].sort((a, b) => a.contract.name.localeCompare(b.contract.name) ), messages: input.messages |

<!-- flow-hash: 1ee36124b8efa3c2c9d5d8a9cbe87b59eae9e2bfbeef11f64d0abf10c3834f7a -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step render.title"]
  n4["step render.scenarioSection"]
  n5["step render.toc"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 3 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### cart.normalPurchase

> `cart.normalPurchase`

### Acceptance Criteria

> Business requirements that this contract fulfills.

- ユーザーは複数のアイテムをカートに入れて購入できる

| # | Operation | Input |
|---|------|------|
| 1 | `cart.create` | userId: input.userId |
| 2 | `cart.addItem` | itemId: 'apple', qty: 3, price: 1.5 |
| 3 | `cart.addItem` | itemId: 'banana', qty: 1, price: 0.8 |

<!-- flow-hash: 6cbe017fd466c86ecc80e79551c53dcf6ef9c2bafb1f43635abe77eee824c7c2 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step cart.create"]
  n4["step cart.addItem"]
  n5["step cart.addItem"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 3 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### cart.duplicateCreate

> `cart.duplicateCreate`

| # | Operation | Input |
|---|------|------|
| 1 | `cart.create` | userId: input.userId |
| 2 | `cart.create` | userId: input.userId |

<!-- flow-hash: 87683774917bf1870d9be3e86bc7aba05d71ae179df925f12420655bcf68532e -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step cart.create"]
  n4["step cart.create"]
  n1 --> n3
  n3 --> n4
  n4 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 2 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

## Table of Contents

- **cart.addItem** （Preconditions: 2, Tests: 0）
- **cart.addItem** （Preconditions: 2, Tests: 0）
- **cart.create** （Preconditions: 1, Tests: 0）
- **cart.create** （Preconditions: 1, Tests: 0）
- **cart.removeItem** （Preconditions: 2, Tests: 0）
- **doc.analyze** （Preconditions: 0, Tests: 4）
- **doc.filter** （Preconditions: 0, Tests: 4）
- **doc.link** （Preconditions: 0, Tests: 2）
- **doc.parse** （Preconditions: 2, Tests: 8）
- **doc.render** （Preconditions: 0, Tests: 3）
- **render.scenarioSection** （Preconditions: 0, Tests: 2）
- **render.title** （Preconditions: 1, Tests: 3）
- **render.toc** （Preconditions: 0, Tests: 3）
- **report.replay** （Preconditions: 1, Tests: 4）
- **report.summary** （Preconditions: 1, Tests: 5）

---

## Contract Details

---

## cart.addItem

### Acceptance Criteria

> Business requirements that this contract fulfills.

- カートに新しいアイテムを追加できる

| Property | Type |
|------|-----|
| State | `CartState` |
| Input | `{ itemId: string; qty: number; price: number }` |
| Error | `CartNotFound | DuplicateItem` |

<!-- flow-hash: c516a3e1888d3ab8dbdfe573dff06504fb64caad400cd8de9c645217f5b005de -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5{"pre.2"}
  n6(["error(pre.2)"])
  n7["transition"]
  n8["return ({ ...state, items: new Map([ ...state.items, [input.itemId, ..."]
  n9["post.1"]
  n10["invariant.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 -->|fail| n6
  n5 -->|pass| n7
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 6 |
| Branch count | 0 |
| Error path count | 2 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | カートが存在していること | `CartNotFound` |
| 2 | 同じアイテムが既にカートに存在していないこと | `DuplicateItem` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | アイテム数が1つ増加する |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | すべてのアイテムの数量が正の値である |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `CartNotFound` | Precondition #1 |
| `DuplicateItem` | Precondition #2 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

_No tests found. Add a `describe('contract.id', ...)` block._

---

## cart.addItem

| Property | Type |
|------|-----|
| State | `CartState` |
| Input | `{ itemId: string; qty: number; price: number }` |
| Error | `CartNotFound | DuplicateItem` |

<!-- flow-hash: 0e4dc7597c052ac9704a9949fbdcae95bff45d79ef687b26d2ba8348c888320b -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5{"pre.2"}
  n6(["error(pre.2)"])
  n7["transition"]
  n8["return ({ ...state, items: new Map([ ...state.items, [input.itemId, ..."]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 -->|fail| n6
  n5 -->|pass| n7
  n7 --> n8
  n8 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 4 |
| Branch count | 0 |
| Error path count | 2 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | カートが存在していること | `CartNotFound` |
| 2 | 同じアイテムが既にカートに存在していないこと | `DuplicateItem` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

_Not defined_

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `CartNotFound` | Precondition #1 |
| `DuplicateItem` | Precondition #2 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

_No tests found. Add a `describe('contract.id', ...)` block._

---

## cart.create

### Acceptance Criteria

> Business requirements that this contract fulfills.

- ユーザーは新しいカートを作成できる
- 既にカートが存在する場合はエラーが返される

| Property | Type |
|------|-----|
| State | `CartState` |
| Input | `{ userId: string }` |
| Error | `AlreadyExists` |

<!-- flow-hash: a7ef477891c350e9cd81da799c2e25b7226285250f4476559d43fdaf3c92e46f -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["return ({ ...state, exists: true, userId: input.userId, })"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 3 |
| Branch count | 0 |
| Error path count | 1 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | カートがまだ存在していないこと | `AlreadyExists` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

_Not defined_

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `AlreadyExists` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

_No tests found. Add a `describe('contract.id', ...)` block._

---

## cart.create

| Property | Type |
|------|-----|
| State | `CartState` |
| Input | `{ userId: string }` |
| Error | `AlreadyExists` |

<!-- flow-hash: 0a0ca4513a0d3fdbcedb031f935bae4cad8e7dbf88c1816a4886afc99d51c57b -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["return ({ ...state, exists: true })"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 3 |
| Branch count | 0 |
| Error path count | 1 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | カートがまだ存在していないこと | `AlreadyExists` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

_Not defined_

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `AlreadyExists` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

_No tests found. Add a `describe('contract.id', ...)` block._

---

## cart.removeItem

| Property | Type |
|------|-----|
| State | `CartState` |
| Input | `{ itemId: string }` |
| Error | `CartNotFound | ItemNotFound` |

<!-- flow-hash: b088a8d82e1b0167042109d1d59bd5041a70f47a28e632bcb48f315ba788f27e -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5{"pre.2"}
  n6(["error(pre.2)"])
  n7["transition"]
  n8["const items = new Map(state.items);"]
  n9["items.delete(input.itemId);"]
  n10["return { ...state, items }"]
  n11["post.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 -->|fail| n6
  n5 -->|pass| n7
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 --> n11
  n11 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 7 |
| Branch count | 0 |
| Error path count | 2 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | カートが存在していること | `CartNotFound` |
| 2 | アイテムが存在していること | `ItemNotFound` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | アイテム数が1つ減少する |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `CartNotFound` | Precondition #1 |
| `ItemNotFound` | Precondition #2 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

_No tests found. Add a `describe('contract.id', ...)` block._

---

## doc.analyze

### Acceptance Criteria

> Business requirements that this contract fulfills.

- テストカバレッジを分析してレポートを生成できる

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `AnalyzeInput` |
| Error | `never` |

<!-- flow-hash: 41aa4524f7302e91f31bf9133af3a4d1b34a71ee1f05dc834c58bfae2a38a3b3 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4{"if !input.enabled"}
  n5["return state"]
  n6["const coverageReport = analyzeCoverage(state.linked);"]
  n7["return { ...state, coverageReport }"]
  n8["post.1"]
  n1 --> n3
  n3 --> n4
  n4 -->|true| n5
  n4 -->|false| n6
  n5 --> n8
  n6 --> n7
  n7 --> n8
  n8 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 6 |
| Branch count | 1 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | coverage report is present when analysis is enabled |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | generates coverage report when enabled | Succeeds |
| 2 | skips coverage when disabled | Succeeds |
| 3 | post/invariant: hold when enabled | Succeeds |
| 4 | post/invariant: hold when disabled | Succeeds |

---

## doc.filter

### Acceptance Criteria

> Business requirements that this contract fulfills.

- 指定されたIDでContractをフィルタリングできる

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `FilterInput` |
| Error | `never` |

<!-- flow-hash: 3225329e243f73cc9b79acccd0841fa71fcfa8fabbf564e8e659ea6faf930bbf -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4{"if input.filterIds && input.filterIds.size > 0"}
  n5["return { ...state, filtered: state.contracts.filter( (c) => input.fi..."]
  n6["return { ...state, filtered: [...state.contracts] }"]
  n7["post.1"]
  n1 --> n3
  n3 --> n4
  n4 -->|true| n5
  n4 -->|false| n6
  n5 --> n7
  n6 --> n7
  n7 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 5 |
| Branch count | 1 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | filtered contracts are a subset of all contracts |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | filters contracts by IDs | Succeeds |
| 2 | passes all contracts when no filter | Succeeds |
| 3 | returns empty when filter matches nothing | Succeeds |
| 4 | post/invariant: hold after transition | Succeeds |

---

## doc.link

### Acceptance Criteria

> Business requirements that this contract fulfills.

- Contractとテストスイートを紐付けできる

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `Record<string, never>` |
| Error | `never` |

<!-- flow-hash: 1a4eefd6f3f3cc1c3bd189690b70b805e5b4ee7bde32777c1ea0682823149ecd -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4["const linked = linkContractsToTests(state.filtered, state.tes..."]
  n5["const linkedScenarios = linkScenarios(state.scenarios, state...."]
  n6["return { ...state, linked, linkedScenarios }"]
  n7["post.1"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n6
  n6 --> n7
  n7 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 5 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | every filtered contract has a corresponding linked entry |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | links contracts to tests | Succeeds |
| 2 | post/invariant: hold after transition | Succeeds |

---

## doc.parse

### Acceptance Criteria

> Business requirements that this contract fulfills.

- ソースファイルからContract・Scenario・テストをパースできる
- ソースファイルが未指定の場合はエラーを返す

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `ParseInput` |
| Error | `PipelineError` |

<!-- flow-hash: d76f606ef632fca1a6ff64b8a89cd0bb9b0956c21d586d14e5440fc882cac9fd -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5{"pre.2"}
  n6(["error(pre.2)"])
  n7["transition"]
  n8["const contracts: ParsedContract[] = [];"]
  n9["const scenarios: ParsedScenario[] = [];"]
  n10["const testSuites: ParsedTestSuite[] = [];"]
  n11["const sourceFilePaths: string[] = [];"]
  n12{"for-of input.sourceFiles"}
  n13["sourceFilePaths.push(entry.path);"]
  n14[["unsupported: SwitchStatement"]]
  n15["return { ...state, sourceFiles: [...new Set(sourceFilePaths)], contr..."]
  n16["post.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 -->|fail| n6
  n5 -->|pass| n7
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 --> n11
  n11 --> n12
  n12 -->|iterate| n13
  n12 -->|done| n15
  n13 --> n14
  n14 -->|next| n12
  n15 --> n16
  n16 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 11 |
| Branch count | 1 |
| Error path count | 2 |
| Unanalyzable count | 1 |

> Warning: 1 unsupported syntax path(s) were detected.

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | source files must not be empty | `NoSourceFiles` |
| 2 | scenario flow must be deterministic | `DynamicScenarioFlow` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | source file paths are tracked uniquely |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoSourceFiles` | Precondition #1 |
| `DynamicScenarioFlow` | Precondition #2 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | parses contracts from source files | Succeeds |
| 2 | parses test suites from source files | Succeeds |
| 3 | rejects empty source files | Returns error |
| 4 | rejects dynamic scenario flow patterns | Returns error |
| 5 | rejects non-direct step elements in scenario flow arrays | Returns error |
| 6 | preserves title and messages | Succeeds |
| 7 | post/invariant: hold after transition | - |
| 8 | exposes contract metadata | - |

---

## doc.render

### Acceptance Criteria

> Business requirements that this contract fulfills.

- パイプライン状態からMarkdownドキュメントを生成できる

| Property | Type |
|------|-----|
| State | `DocPipelineState` |
| Input | `Record<string, never>` |
| Error | `never` |

<!-- flow-hash: 25f767374f8d93c02b82ca9da521e0b85455cb10324ae3a0a9f0e3e90f6f80de -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4["const result = renderMarkdownScenario([], { title: state.titl..."]
  n5["const baseLines = isOk(result) ? result.value : [];"]
  n6["let lines = renderContractSections(baseLines, { contracts: st..."]
  n7{"if state.coverageReport"}
  n8["lines = renderCoverageSection(lines, { report: state.coverage..."]
  n9["const markdown = lines.join('\\n').replace(/\\n{3,}/g, '\\n\\n');"]
  n10["return { ...state, markdown }"]
  n11["post.1"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n6
  n6 --> n7
  n7 -->|true| n8
  n7 -->|false| n9
  n8 --> n9
  n9 --> n10
  n10 --> n11
  n11 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 9 |
| Branch count | 1 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | non-empty linked state produces non-empty markdown |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders markdown from linked state | Succeeds |
| 2 | renders title-only markdown for empty state | Succeeds |
| 3 | post/invariant: hold after transition | Succeeds |

---

## render.scenarioSection

### Acceptance Criteria

> Business requirements that this contract fulfills.

- シナリオセクションをレンダリングできる

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `ScenarioSectionInput` |
| Error | `RenderError` |

<!-- flow-hash: 22883c1b1c8b31d57955c89e7fa127cd42ce14de6b88079570b4400fc30265b0 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4["return input.scenarios.length === 0 ? lines : [ ...lines, ...renderS..."]
  n5["post.1"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 3 |
| Branch count | 0 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | rendering scenario section appends lines only when scenarios exist |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders scenario section | Succeeds |
| 2 | skips scenario section when scenarios are empty | Succeeds |

---

## render.title

### Acceptance Criteria

> Business requirements that this contract fulfills.

- ドキュメントのタイトルと説明をレンダリングできる

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `TitleInput` |
| Error | `RenderError` |

<!-- flow-hash: 754aa1b5d9622b61e90d3f9cabb9b3350e30191690587365dddec4a4b51af881 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["const result = [...lines, `# ${input.title}`, ''];"]
  n7{"if input.description"}
  n8["return [...result, `> ${input.description}`, '']"]
  n9["return result"]
  n10["post.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
  n7 -->|true| n8
  n7 -->|false| n9
  n8 --> n10
  n9 --> n10
  n10 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 7 |
| Branch count | 1 |
| Error path count | 1 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | document title must not be empty | `TitleEmpty` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | rendering a title always appends new lines |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `TitleEmpty` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders title with description | Succeeds |
| 2 | rejects empty title | Returns error |
| 3 | post: lines increase after transition | - |

---

## render.toc

### Acceptance Criteria

> Business requirements that this contract fulfills.

- 2つ以上のContractがある場合に目次を生成できる

| Property | Type |
|------|-----|
| State | `readonly string[]` |
| Input | `TocInput` |
| Error | `RenderError` |

<!-- flow-hash: c0cd15cdc9468232f6084c7afd4b1388bfbbe19b365b2a0d4b697de53397c082 -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4["const { contracts, messages } = input;"]
  n5{"if contracts.length < 2"}
  n6["return lines"]
  n7["const result = [...lines];"]
  n8["result.push(`## ${messages.toc.title}`);"]
  n9["result.push('');"]
  n10{"for-of contracts"}
  n11["const { contract } = linked;"]
  n12["const firstLine = contract.description?.split('\\n')[0]?.trim();"]
  n13["const testCount = linked.testSuite?.tests.length ?? 0;"]
  n14["const guardCount = contract.guards.length;"]
  n15["const label = firstLine ? `**${contract.name}** - ${firstLine..."]
  n16["const meta = messages.toc.meta(guardCount, testCount);"]
  n17["result.push(`- ${label} （${meta}）`);"]
  n18["result.push('');"]
  n19["return result"]
  n20["post.1"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 -->|true| n6
  n5 -->|false| n7
  n6 --> n20
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 -->|iterate| n11
  n10 -->|done| n18
  n11 --> n12
  n12 --> n13
  n13 --> n14
  n14 --> n15
  n15 --> n16
  n16 --> n17
  n17 -->|next| n10
  n18 --> n19
  n19 --> n20
  n20 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 18 |
| Branch count | 2 |
| Error path count | 0 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

_Not defined_

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | rendering TOC appends lines only when two or more contracts are present |

### Invariants

> Conditions that must hold both before and after this operation.

_Not defined_

### Error Catalog

_No errors defined_

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | renders TOC for 2+ contracts | Succeeds |
| 2 | skips TOC when fewer than 2 contracts | Succeeds |
| 3 | post: lines increase after transition | - |

---

## report.replay

### Acceptance Criteria

> Business requirements that this contract fulfills.

- 失敗したPBT検証のリプレイコマンドを生成できる

| Property | Type |
|------|-----|
| State | `string` |
| Input | `ReporterInput` |
| Error | `ReporterError` |

<!-- flow-hash: bfe9749c6cef33bc00c7c7260ec1e97efae5e707b9433a56ef908517c4c64f3f -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["return replay(input.result)"]
  n7["post.1"]
  n8["invariant.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
  n7 --> n8
  n8 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 5 |
| Branch count | 0 |
| Error path count | 1 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | must have at least one failure to generate replay | `NoFailures` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | output is non-empty |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | output is always a string |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoFailures` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | formats failed result | Succeeds |
| 2 | rejects successful result | Returns error |
| 3 | post/invariant: hold after transition | - |
| 4 | exposes contract metadata | - |

---

## report.summary

### Acceptance Criteria

> Business requirements that this contract fulfills.

- PBT検証結果のサマリーレポートを生成できる

| Property | Type |
|------|-----|
| State | `string` |
| Input | `ReporterInput` |
| Error | `ReporterError` |

<!-- flow-hash: dc24903e89b1cfeaaa41b000bc2d65265126f95340f36a6a313f6ee66716036d -->
<details>
<summary>Flowchart (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["return summary(input.result)"]
  n7["post.1"]
  n8["invariant.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
  n7 --> n8
  n8 --> n2
```

</details>

#### Flow Summary

| Metric | Value |
|---|---|
| Processing steps | 5 |
| Branch count | 0 |
| Error path count | 1 |
| Unanalyzable count | 0 |

### Preconditions

> Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.

| # | Condition | Error |
|---|------|--------|
| 1 | verification results must not be empty | `NoResults` |

### Postconditions

> Conditions guaranteed to hold after this operation completes successfully.

| # | Condition |
|---|------|
| 1 | output contains seizu-verify header |

### Invariants

> Conditions that must hold both before and after this operation.

| # | Condition |
|---|------|
| 1 | output is always a string |

### Error Catalog

| Error Tag | Source |
|-----------|--------|
| `NoResults` | Precondition #1 |

### Test Cases

> Test scenarios that verify the behavior of this operation.

| # | Scenario | Expected Result |
|---|---------|---------|
| 1 | formats passing result | Succeeds |
| 2 | formats result with multiple contracts | Succeeds |
| 3 | rejects empty results | Returns error |
| 4 | post/invariant: hold after transition | - |
| 5 | exposes contract metadata | - |

---

## Test Coverage

> Test coverage status for each contract.

| Contract | Tests | Error Tag Coverage | Status |
|----------|-------|---------------|--------|
| doc.parse | 8 | 0/2 | Tested |
| doc.filter | 4 | - | Tested |
| doc.link | 2 | - | Tested |
| doc.analyze | 4 | - | Tested |
| doc.render | 3 | - | Tested |
| render.title | 3 | 0/1 | Tested |
| render.toc | 3 | - | Tested |
| render.scenarioSection | 2 | - | Tested |
| report.summary | 5 | 0/1 | Tested |
| report.replay | 4 | 0/1 | Tested |
| cart.create | 0 | 0/1 | Untested |
| cart.addItem | 0 | 0/2 | Untested |
| cart.removeItem | 0 | 0/2 | Untested |
| cart.create | 0 | 0/1 | Untested |
| cart.addItem | 0 | 0/2 | Untested |

Contract coverage: 10/15 (66.7%)
Error tag coverage: 0/13 (0.0%)
