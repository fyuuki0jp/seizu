import { define, err, pass } from 'kata';
import { replay } from '../verify/reporters/replay';
import { summary } from '../verify/reporters/summary';
import type { ReporterError, ReporterInput } from './types';

// === report.summary ===

export const reportSummary = define<string, ReporterInput, ReporterError>({
  id: 'report.summary',
  pre: [
    /** Verification results must not be empty */
    (_, input) =>
      input.result.results.length > 0
        ? pass
        : err({ tag: 'NoResults' as const }),
  ],
  transition: (_, input) => summary(input.result),
  post: [
    /** Output contains kata-verify header */
    (_, after) => after.includes('kata-verify'),
  ],
  invariant: [
    /** Output is always a string */
    (state) => typeof state === 'string',
  ],
});

// === report.replay ===

export const reportReplay = define<string, ReporterInput, ReporterError>({
  id: 'report.replay',
  pre: [
    /** Must have at least one failure to generate replay */
    (_, input) =>
      !input.result.success ? pass : err({ tag: 'NoFailures' as const }),
  ],
  transition: (_, input) => replay(input.result),
  post: [
    /** Output is non-empty */
    (_, after) => after.length > 0,
  ],
  invariant: [
    /** Output is always a string */
    (state) => typeof state === 'string',
  ],
});
