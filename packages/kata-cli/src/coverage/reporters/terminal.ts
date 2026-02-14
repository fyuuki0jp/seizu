import type { CoverageReport } from '../../doc/analyzer/coverage-types';
import type { Messages } from '../../doc/i18n/types';

export function formatCoverageReport(
  report: CoverageReport,
  messages: Messages
): string {
  const cov = messages.coverage;
  const lines: string[] = [];

  lines.push(`=== ${cov.title} ===`);
  lines.push('');

  for (const contract of report.contracts) {
    const status = contract.hasTests ? cov.tested : cov.untested;
    const errorCov =
      contract.totalErrorTags > 0
        ? `${contract.coveredErrorTags}/${contract.totalErrorTags}`
        : '-';
    lines.push(
      `  ${contract.contractId}  [${status}]  tests: ${contract.testCount}  errors: ${errorCov}`
    );
  }

  lines.push('');
  lines.push(
    cov.summaryContract(
      report.summary.testedContracts,
      report.summary.totalContracts,
      report.summary.contractCoveragePercent
    )
  );
  lines.push(
    cov.summaryErrorTag(
      report.summary.coveredErrorTags,
      report.summary.totalErrorTags,
      report.summary.errorTagCoveragePercent
    )
  );

  return lines.join('\n');
}
