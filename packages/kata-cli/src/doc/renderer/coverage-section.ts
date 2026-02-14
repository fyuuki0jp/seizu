import type { CoverageReport } from '../analyzer/coverage-types';
import type { Messages } from '../i18n/types';

export function renderCoverageSummary(
  report: CoverageReport,
  messages: Messages
): string {
  const lines: string[] = [];
  const cov = messages.coverage;

  lines.push(`## ${cov.title}`);
  lines.push('');
  lines.push(`> ${cov.description}`);
  lines.push('');

  // Contract coverage table
  lines.push(
    `| ${cov.columnContract} | ${cov.columnTests} | ${cov.columnErrorCoverage} | ${cov.columnStatus} |`
  );
  lines.push('|----------|-------|---------------|--------|');

  for (const contract of report.contracts) {
    const status = contract.hasTests ? cov.tested : cov.untested;
    const errorCov =
      contract.totalErrorTags > 0
        ? `${contract.coveredErrorTags}/${contract.totalErrorTags}`
        : '-';
    lines.push(
      `| ${contract.contractId} | ${contract.testCount} | ${errorCov} | ${status} |`
    );
  }

  lines.push('');

  // Summary
  const { summary } = report;
  lines.push(
    cov.summaryContract(
      summary.testedContracts,
      summary.totalContracts,
      summary.contractCoveragePercent
    )
  );
  lines.push(
    cov.summaryErrorTag(
      summary.coveredErrorTags,
      summary.totalErrorTags,
      summary.errorTagCoveragePercent
    )
  );
  lines.push('');

  return lines.join('\n');
}
