# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

kata (型) — TypeScript のコントラクトベース状態遷移ライブラリ。`define()` で `{ pre, transition, post, invariant }` を宣言すると、実行可能な関数と PBT 検証可能なメタデータを同時に得られる。ドメイン駆動設計のビジネスロジック層で使うことを想定している。

## Commands

```bash
pnpm build                    # 全パッケージビルド (turbo)
pnpm test                     # 全パッケージテスト (turbo)
pnpm test:coverage            # カバレッジ付きテスト (80%閾値)
pnpm --filter kata test       # kata 単体テスト
pnpm --filter kata-cli test   # kata-cli 単体テスト
pnpm lint                     # Biome でチェック
pnpm lint:fix                 # Biome で自動修正
pnpm format                   # Biome でフォーマット
```

単一テストファイル実行: `npx vitest run packages/kata/tests/define.test.ts`

## Architecture

pnpm ワークスペースの monorepo。Turbo でビルド順序管理（build は ^build に依存、test は ^build に依存）。

### packages/kata — コアライブラリ（ゼロ依存）

状態遷移をコントラクトで宣言し実行する。3つのエクスポートパスを持つ:

- `kata` — `define()`, `scenario()`, `step()`, Result 操作 (`ok`, `err`, `isOk`, `isErr`, `map`, `flatMap`, `match`, `pass`)
- `kata/testing` — テストヘルパー (`expectOk`, `expectErr`)
- `kata/verify` — PBT 検証 (`verify`, `verifyContract`, `assertContractValid`)。fast-check を peer dependency として利用

**核心パターン — Callable Function + Metadata**:
`define()` と `scenario()` は `Object.assign(execute, def)` で「関数として呼び出せ、かつプロパティでメタデータにアクセスできる」オブジェクトを返す。これにより実行と検証を同じ値で行える。

```
result.ts  → Result<T,E> 型 + ok/err/isOk/isErr/map/flatMap/match/pass
types.ts   → Guard, Condition, Invariant, ContractDef, Contract 型定義
define.ts  → define() — pre ガードを順に評価し、全 pass なら transition 実行
scenario.ts → scenario()/step() — 複数コントラクトを state threading で連鎖実行
verify/    → fast-check で pre_not_guarded, postcondition_failed, invariant_failed, unexpected_error を検出
```

### packages/kata-cli — CLI ツール

kata コントラクトの静的解析・ドキュメント生成・PBT 検証を CLI で提供。kata に依存。

```
doc/       → TypeScript ソースからコントラクト定義をパース → リンク → Markdown レンダリング
verify/    → PBT 検証の設定・レポーター (JSON, replay, summary)
coverage/  → コントラクトカバレッジレポーター
commands/  → cac によるCLIコマンド定義 (doc, verify, coverage)
```

## Code Conventions

- **Biome**: シングルクォート、セミコロン必須、2スペースインデント、ES5 trailing comma
- **TypeScript**: ES2022 target, strict mode, `readonly` 徹底
- **命名**: 型は PascalCase、関数は camelCase、ファイルは kebab-case、コントラクト ID は `集約名.コマンド名`
- **エラー**: tagged union `{ readonly tag: 'ErrorName' }` — タグリテラルに `as const`
- **インポート**: 型には `import type` を使う。default export は使わない
- **コミット**: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **pre-commit hook**: Husky + lint-staged で Biome check --write が自動実行される
