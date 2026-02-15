import { check, define, ensure, err, guard, pass } from 'kata';
import { replay } from '../verify/reporters/replay';
import { summary } from '../verify/reporters/summary';
import type { ReporterError, ReporterInput } from './types';

// === report.summary ===

/** @accepts PBT検証結果のサマリーレポートを生成できる */
export const reportSummary = define<string, ReporterInput, ReporterError>(
  'report.summary',
  {
    pre: [
      guard('verification results must not be empty', (_, input) =>
        input.result.results.length > 0
          ? pass
          : err({ tag: 'NoResults' as const })
      ),
    ],
    transition: (_, input) => summary(input.result),
    post: [
      check('output contains kata-verify header', (_, after) =>
        after.includes('kata-verify')
      ),
    ],
    invariant: [
      ensure('output is always a string', (state) => typeof state === 'string'),
    ],
  }
);

// === report.replay ===

/** @accepts 失敗したPBT検証のリプレイコマンドを生成できる */
export const reportReplay = define<string, ReporterInput, ReporterError>(
  'report.replay',
  {
    pre: [
      guard('must have at least one failure to generate replay', (_, input) =>
        !input.result.success ? pass : err({ tag: 'NoFailures' as const })
      ),
    ],
    transition: (_, input) => replay(input.result),
    post: [check('output is non-empty', (_, after) => after.length > 0)],
    invariant: [
      ensure('output is always a string', (state) => typeof state === 'string'),
    ],
  }
);
