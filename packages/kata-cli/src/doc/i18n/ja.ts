import type { Messages } from './types';

export const ja: Messages = {
  toc: {
    title: '目次',
    meta: (guardCount, testCount) =>
      `事前条件: ${guardCount}件, テスト: ${testCount}件`,
  },
  typeTable: {
    headerItem: '項目',
    headerType: '型',
    state: '状態 (State)',
    input: '入力 (Input)',
    error: 'エラー (Error)',
  },
  preconditions: {
    title: '事前条件',
    description:
      'この処理を実行する前に満たされている必要がある条件です。条件を満たさない場合、対応するエラーが返されます。',
    columnCondition: '条件',
    columnError: 'エラー',
  },
  postconditions: {
    title: '事後条件',
    description: 'この処理が正常に完了した後に保証される条件です。',
    columnCondition: '条件',
  },
  invariants: {
    title: '不変条件',
    description: 'この処理の前後を問わず、常に成り立つべき条件です。',
    columnCondition: '条件',
  },
  errorCatalog: {
    title: 'エラー一覧',
    noErrors: '_エラー定義なし_',
    columnTag: 'エラータグ',
    columnSource: '発生元',
    sourceRef: (index) => `事前条件 #${index}`,
  },
  testExamples: {
    title: 'テストケース',
    description: 'この処理の動作を検証するテストシナリオです。',
    noTests:
      "_テストが見つかりません。`describe('contract.id', ...)` ブロックを追加してください。_",
    columnScenario: 'シナリオ',
    columnExpected: '期待結果',
  },
  testResult: {
    success: '正常に処理される',
    errorTag: (tag) => `エラー: \`${tag}\``,
    errorGeneric: 'エラーが返される',
  },
  coverage: {
    title: 'テスト網羅性',
    description: '各Contractに対するテストの網羅状況です。',
    columnContract: 'Contract',
    columnTests: 'テスト数',
    columnErrorCoverage: 'エラータグ網羅',
    columnStatus: '状態',
    tested: 'テスト済',
    untested: '未テスト',
    summaryContract: (tested, total, pct) =>
      `Contract網羅率: ${tested}/${total} (${pct.toFixed(1)}%)`,
    summaryErrorTag: (covered, total, pct) =>
      `エラータグ網羅率: ${covered}/${total} (${pct.toFixed(1)}%)`,
  },
  noDefined: '_定義なし_',
  noDescription: '_説明なし（TSDocコメントを追加してください）_',
};
