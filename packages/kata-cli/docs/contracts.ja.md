# kata-cli Contract Specification

> kata-cli domain logic contracts — self-documenting dogfooding example

## シナリオ

> 複数のContract操作を組み合わせたビジネスワークフローです。

### doc.generate

> `doc.generate`

### 受け入れ条件

> このContractが担保するビジネス要求です。

- ソースファイルからContract仕様書を自動生成できる

| # | 操作 | 入力 |
|---|------|------|
| 1 | `doc.parse` | sourceFiles: input.sourceFiles |
| 2 | `doc.filter` | filterIds: input.filterIds |
| 3 | `doc.link` | - |
| 4 | `doc.analyze` | enabled: input.coverageEnabled |
| 5 | `doc.render` | - |

<!-- flow-hash: e2aa910ce0e8b6c8994bc92f6872b816f8d6ea26f7315b895eb86d20e89922c4 -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 0 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

### coverage.generate

> `coverage.generate`

### 受け入れ条件

> このContractが担保するビジネス要求です。

- テストカバレッジレポートを生成できる

| # | 操作 | 入力 |
|---|------|------|
| 1 | `doc.parse` | sourceFiles: input.sourceFiles |
| 2 | `doc.filter` | filterIds: input.filterIds |
| 3 | `doc.link` | - |
| 4 | `doc.analyze` | enabled: true |

<!-- flow-hash: dc55991c965b071f2945f019362a697d104a6dde190695344657250eb7ca5424 -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 4 |
| 分岐数 | 0 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

### render.markdown

> `render.markdown`

### 受け入れ条件

> このContractが担保するビジネス要求です。

- タイトル・シナリオ・目次をMarkdownとして組み立てられる

| # | 操作 | 入力 |
|---|------|------|
| 1 | `render.title` | title: input.title, description: input.description |
| 2 | `render.scenarioSection` | scenarios: input.scenarios, messages: input.messages, flowEnabled: input.flowEnabled |
| 3 | `render.toc` | contracts: sorted, messages: input.messages |

<!-- flow-hash: fd82a19d02f2f6113cf5e913abe609866ed3bf73a16e3b02bd09ecdc5b6aa481 -->
<details>
<summary>フローチャート (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["end"])
  n3["step render.title"]
  n4{"if input.scenarios.length > 0"}
  n5["step render.scenarioSection"]
  n6{"if sorted.length > 1"}
  n7["step render.toc"]
  n1 --> n3
  n3 --> n4
  n4 -->|true| n5
  n4 -->|false| n6
  n5 --> n6
  n6 -->|false| n2
  n6 -->|true| n7
  n7 --> n2
```

</details>

#### Flow Summary

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 2 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

## 目次

- **doc.analyze** （事前条件: 0件, テスト: 4件）
- **doc.filter** （事前条件: 0件, テスト: 4件）
- **doc.link** （事前条件: 0件, テスト: 2件）
- **doc.parse** （事前条件: 1件, テスト: 6件）
- **doc.render** （事前条件: 0件, テスト: 3件）
- **render.scenarioSection** （事前条件: 1件, テスト: 2件）
- **render.title** （事前条件: 1件, テスト: 3件）
- **render.toc** （事前条件: 1件, テスト: 3件）
- **report.replay** （事前条件: 1件, テスト: 4件）
- **report.summary** （事前条件: 1件, テスト: 5件）

---

## Contract詳細

---

## doc.analyze

### 受け入れ条件

> このContractが担保するビジネス要求です。

- テストカバレッジを分析してレポートを生成できる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `DocPipelineState` |
| 入力 (Input) | `AnalyzeInput` |
| エラー (Error) | `never` |

<!-- flow-hash: 41aa4524f7302e91f31bf9133af3a4d1b34a71ee1f05dc834c58bfae2a38a3b3 -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 6 |
| 分岐数 | 1 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

_定義なし_

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | coverage report is present when analysis is enabled |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

_エラー定義なし_

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | generates coverage report when enabled | 正常に処理される |
| 2 | skips coverage when disabled | 正常に処理される |
| 3 | post/invariant: hold when enabled | 正常に処理される |
| 4 | post/invariant: hold when disabled | 正常に処理される |

---

## doc.filter

### 受け入れ条件

> このContractが担保するビジネス要求です。

- 指定されたIDでContractをフィルタリングできる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `DocPipelineState` |
| 入力 (Input) | `FilterInput` |
| エラー (Error) | `never` |

<!-- flow-hash: 3225329e243f73cc9b79acccd0841fa71fcfa8fabbf564e8e659ea6faf930bbf -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 1 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

_定義なし_

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | filtered contracts are a subset of all contracts |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

_エラー定義なし_

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | filters contracts by IDs | 正常に処理される |
| 2 | passes all contracts when no filter | 正常に処理される |
| 3 | returns empty when filter matches nothing | 正常に処理される |
| 4 | post/invariant: hold after transition | 正常に処理される |

---

## doc.link

### 受け入れ条件

> このContractが担保するビジネス要求です。

- Contractとテストスイートを紐付けできる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `DocPipelineState` |
| 入力 (Input) | `Record<string, never>` |
| エラー (Error) | `never` |

<!-- flow-hash: 1a4eefd6f3f3cc1c3bd189690b70b805e5b4ee7bde32777c1ea0682823149ecd -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 0 |
| エラー経路数 | 0 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

_定義なし_

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | every filtered contract has a corresponding linked entry |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

_エラー定義なし_

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | links contracts to tests | 正常に処理される |
| 2 | post/invariant: hold after transition | 正常に処理される |

---

## doc.parse

### 受け入れ条件

> このContractが担保するビジネス要求です。

- ソースファイルからContract・Scenario・テストをパースできる
- ソースファイルが未指定の場合はエラーを返す

| 項目 | 型 |
|------|-----|
| 状態 (State) | `DocPipelineState` |
| 入力 (Input) | `ParseInput` |
| エラー (Error) | `PipelineError` |

<!-- flow-hash: 830484c959dd51c1fdcb6768098d786dca8f795cb337037991b06ca38afb6446 -->
<details>
<summary>フローチャート (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["const contracts: ParsedContract[] = [];"]
  n7["const scenarios: ParsedScenario[] = [];"]
  n8["const testSuites: ParsedTestSuite[] = [];"]
  n9["const sourceFilePaths: string[] = [];"]
  n10{"for-of input.sourceFiles"}
  n11["sourceFilePaths.push(entry.path);"]
  n12[["unsupported: SwitchStatement"]]
  n13["return { ...state, sourceFiles: [...new Set(sourceFilePaths)], contr..."]
  n14["post.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
  n7 --> n8
  n8 --> n9
  n9 --> n10
  n10 -->|iterate| n11
  n10 -->|done| n13
  n11 --> n12
  n12 -->|next| n10
  n13 --> n14
  n14 --> n2
```

</details>

#### Flow Summary

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 10 |
| 分岐数 | 1 |
| エラー経路数 | 1 |
| 解析不能数 | 1 |

> 注意: 未対応構文により 1 件の解析不能経路があります。

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | source files must not be empty | `NoSourceFiles` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | source file paths are tracked uniquely |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `NoSourceFiles` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | parses contracts from source files | 正常に処理される |
| 2 | parses test suites from source files | 正常に処理される |
| 3 | rejects empty source files | エラーが返される |
| 4 | preserves title and messages | 正常に処理される |
| 5 | post/invariant: hold after transition | - |
| 6 | exposes contract metadata | - |

---

## doc.render

### 受け入れ条件

> このContractが担保するビジネス要求です。

- パイプライン状態からMarkdownドキュメントを生成できる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `DocPipelineState` |
| 入力 (Input) | `Record<string, never>` |
| エラー (Error) | `never` |

<!-- flow-hash: bb23750cbbe2e4dad5afd6605477107d7163c71182fc9908b1e89af8c6593565 -->
<details>
<summary>フローチャート (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3["transition"]
  n4["const result = renderMarkdownScenario([], { title: state.titl..."]
  n5{"if !isOk(result)"}
  n6(["throw new Error( `render.markdown failed at step ${result.error.ste..."])
  n7["let lines = renderContractSections(result.value, { contracts:..."]
  n8{"if state.coverageReport"}
  n9["lines = renderCoverageSection(lines, { report: state.coverage..."]
  n10["const markdown = lines.join('\\n').replace(/\\n{3,}/g, '\\n\\n');"]
  n11["return { ...state, markdown }"]
  n12["post.1"]
  n1 --> n3
  n3 --> n4
  n4 --> n5
  n5 -->|true| n6
  n5 -->|false| n7
  n7 --> n8
  n8 -->|true| n9
  n8 -->|false| n10
  n9 --> n10
  n10 --> n11
  n11 --> n12
  n12 --> n2
```

</details>

#### Flow Summary

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 9 |
| 分岐数 | 2 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

_定義なし_

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | non-empty linked state produces non-empty markdown |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

_エラー定義なし_

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | renders markdown from linked state | 正常に処理される |
| 2 | renders title-only markdown for empty state | 正常に処理される |
| 3 | post/invariant: hold after transition | 正常に処理される |

---

## render.scenarioSection

### 受け入れ条件

> このContractが担保するビジネス要求です。

- シナリオセクションをレンダリングできる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `readonly string[]` |
| 入力 (Input) | `ScenarioSectionInput` |
| エラー (Error) | `RenderError` |

<!-- flow-hash: a7152ea511f01617154c84c8a2352409663426f0768c425e1181c0a402f2e7fb -->
<details>
<summary>フローチャート (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["return [ ...lines, ...renderScenarioSection(input.scenarios, input.m..."]
  n7["post.1"]
  n1 --> n3
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
  n7 --> n2
```

</details>

#### Flow Summary

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 4 |
| 分岐数 | 0 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | scenario section requires at least one parsed scenario | `NoScenarios` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | rendering scenario section appends lines to the existing output |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `NoScenarios` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | renders scenario section | 正常に処理される |
| 2 | rejects empty scenarios | エラーが返される |

---

## render.title

### 受け入れ条件

> このContractが担保するビジネス要求です。

- ドキュメントのタイトルと説明をレンダリングできる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `readonly string[]` |
| 入力 (Input) | `TitleInput` |
| エラー (Error) | `RenderError` |

<!-- flow-hash: 754aa1b5d9622b61e90d3f9cabb9b3350e30191690587365dddec4a4b51af881 -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 7 |
| 分岐数 | 1 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | document title must not be empty | `TitleEmpty` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | rendering a title always appends new lines |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `TitleEmpty` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | renders title with description | 正常に処理される |
| 2 | rejects empty title | エラーが返される |
| 3 | post: lines increase after transition | - |

---

## render.toc

### 受け入れ条件

> このContractが担保するビジネス要求です。

- 2つ以上のContractがある場合に目次を生成できる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `readonly string[]` |
| 入力 (Input) | `TocInput` |
| エラー (Error) | `RenderError` |

<!-- flow-hash: 014093b35e091bd2cd123cb3f6460e4c5e07fbd14475e0aa94709ee35cad75a4 -->
<details>
<summary>フローチャート (Mermaid)</summary>

```mermaid
flowchart TD
  n1(["start"])
  n2(["ok"])
  n3{"pre.1"}
  n4(["error(pre.1)"])
  n5["transition"]
  n6["const { contracts, messages } = input;"]
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
  n3 -->|fail| n4
  n3 -->|pass| n5
  n5 --> n6
  n6 --> n7
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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 17 |
| 分岐数 | 1 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | TOC is meaningful only when two or more contracts are present | `InsufficientContracts` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | rendering TOC appends lines to the existing output |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

_定義なし_

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `InsufficientContracts` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | renders TOC for 2+ contracts | 正常に処理される |
| 2 | rejects fewer than 2 contracts | エラーが返される |
| 3 | post: lines increase after transition | - |

---

## report.replay

### 受け入れ条件

> このContractが担保するビジネス要求です。

- 失敗したPBT検証のリプレイコマンドを生成できる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `string` |
| 入力 (Input) | `ReporterInput` |
| エラー (Error) | `ReporterError` |

<!-- flow-hash: bfe9749c6cef33bc00c7c7260ec1e97efae5e707b9433a56ef908517c4c64f3f -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 0 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | must have at least one failure to generate replay | `NoFailures` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | output is non-empty |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

| # | 条件 |
|---|------|
| 1 | output is always a string |

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `NoFailures` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | formats failed result | 正常に処理される |
| 2 | rejects successful result | エラーが返される |
| 3 | post/invariant: hold after transition | - |
| 4 | exposes contract metadata | - |

---

## report.summary

### 受け入れ条件

> このContractが担保するビジネス要求です。

- PBT検証結果のサマリーレポートを生成できる

| 項目 | 型 |
|------|-----|
| 状態 (State) | `string` |
| 入力 (Input) | `ReporterInput` |
| エラー (Error) | `ReporterError` |

<!-- flow-hash: dc24903e89b1cfeaaa41b000bc2d65265126f95340f36a6a313f6ee66716036d -->
<details>
<summary>フローチャート (Mermaid)</summary>

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

| 指標 | 値 |
|---|---|
| 処理ステップ数 | 5 |
| 分岐数 | 0 |
| エラー経路数 | 1 |
| 解析不能数 | 0 |

### 事前条件

> この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。

| # | 条件 | エラー |
|---|------|--------|
| 1 | verification results must not be empty | `NoResults` |

### 事後条件

> この処理が正常に完了した後に保証される条件です。

| # | 条件 |
|---|------|
| 1 | output contains kata-verify header |

### 不変条件

> この処理の前後を問わず、常に成り立つべき条件です。

| # | 条件 |
|---|------|
| 1 | output is always a string |

### エラー一覧

| エラータグ | 発生元 |
|-----------|--------|
| `NoResults` | 事前条件 #1 |

### テストケース

> この処理の動作を検証するテストシナリオです。

| # | シナリオ | 期待結果 |
|---|---------|---------|
| 1 | formats passing result | 正常に処理される |
| 2 | formats result with multiple contracts | 正常に処理される |
| 3 | rejects empty results | エラーが返される |
| 4 | post/invariant: hold after transition | - |
| 5 | exposes contract metadata | - |

---

## テスト網羅性

> 各Contractに対するテストの網羅状況です。

| Contract | テスト数 | エラータグ網羅 | 状態 |
|----------|-------|---------------|--------|
| doc.parse | 6 | 0/1 | テスト済 |
| doc.filter | 4 | - | テスト済 |
| doc.link | 2 | - | テスト済 |
| doc.analyze | 4 | - | テスト済 |
| doc.render | 3 | - | テスト済 |
| render.title | 3 | 0/1 | テスト済 |
| render.toc | 3 | 0/1 | テスト済 |
| render.scenarioSection | 2 | 0/1 | テスト済 |
| report.summary | 5 | 0/1 | テスト済 |
| report.replay | 4 | 0/1 | テスト済 |

Contract網羅率: 10/10 (100.0%)
エラータグ網羅率: 0/6 (0.0%)
