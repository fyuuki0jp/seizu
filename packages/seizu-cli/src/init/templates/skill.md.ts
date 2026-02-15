/** Generate the content for `.claude/skills/seizu/SKILL.md`. */
export function renderSkillMd(): string {
  return `\
---
name: seizu
description: |
  seizu (星図) を使ってドメイン駆動設計のビジネスロジックを実装する。
  トリガー: "seizu", "コントラクト", "ビジネスロジック", "ドメインモデル", "集約", "ユースケース"
  使用場面: (1) 集約のコマンドハンドラ実装、(2) ビジネスルールのガード定義、(3) ユースケースのシナリオ実装、(4) ドメイン不変条件の宣言と検証
---

# seizu (星図) — ドメインロジック実装ガイド

seizu はドメイン駆動設計（DDD）のビジネスロジックを **コントラクト（事前条件・事後条件・不変条件）** として宣言的に記述し、Property-Based Testing で自動検証する TypeScript ライブラリ。

クリーンアーキテクチャの **ドメイン層（最内周）** に位置し、フレームワークやインフラに一切依存しない純粋なビジネスルールの表現に特化する。

## インポート

\`\`\`typescript
import { define, guard, check, ensure, ok, err, pass, isOk, isErr, map, flatMap, match } from 'seizu';
import type { Result, Contract, Guard, Condition, Invariant } from 'seizu';

import { scenario, step } from 'seizu';
import type { Scenario, ScenarioFailure } from 'seizu';

import { expectOk, expectErr } from 'seizu/testing';
import { verify, verifyContract, assertContractValid } from 'seizu/verify';
\`\`\`

## コード生成ルール

1. **State は readonly plain object** — 集約の全ライフサイクルを1つの型で表現する
2. **Error は tagged union** — \`{ readonly tag: 'ErrorName' }\` 形式
3. **1コントラクト = 1コマンド** — \`define()\` は単一のドメイン操作に対応させる
4. **name は \`集約名.コマンド名\` 形式** — \`cart.create\`, \`order.submit\` など
5. **TSDoc \`@accepts\` で受け入れ条件を宣言**
6. **ガードは \`guard('label', fn)\`** — ラベルは仕様書と PBT レポートに反映
7. **事後条件は \`check('label', fn)\`** — PBT でのみ検証
8. **不変条件は \`ensure('label', fn)\`** — PBT でのみ検証
9. **タグリテラルには \`as const\`**
10. **transition は純粋関数** — 副作用なし
11. **ユースケースは scenario() で組み立てる**
12. **テストでは \`expectOk\` / \`expectErr\` を使う**
`;
}
