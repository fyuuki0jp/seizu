import { describe, expect, test } from 'vitest';
import type { CoverageReport } from '../src/doc/analyzer/coverage-types';
import { getMessages } from '../src/doc/i18n/index';
import { renderCoverageSummary } from '../src/doc/renderer/coverage-section';

const en = getMessages('en');
const ja = getMessages('ja');

describe('renderCoverageSummary', () => {
  const report: CoverageReport = {
    contracts: [
      {
        contractId: 'cart.create',
        hasTests: true,
        testCount: 2,
        totalErrorTags: 1,
        coveredErrorTags: 1,
        uncoveredErrorTags: [],
      },
      {
        contractId: 'cart.addItem',
        hasTests: false,
        testCount: 0,
        totalErrorTags: 2,
        coveredErrorTags: 0,
        uncoveredErrorTags: ['CartNotFound', 'DuplicateItem'],
      },
    ],
    summary: {
      totalContracts: 2,
      testedContracts: 1,
      contractCoveragePercent: 50,
      totalErrorTags: 3,
      coveredErrorTags: 1,
      errorTagCoveragePercent: 33.3,
    },
  };

  test('renders markdown coverage table with English locale', () => {
    const output = renderCoverageSummary(report, en);
    expect(output).toContain('## Test Coverage');
    expect(output).toContain('| Contract |');
    expect(output).toContain('| cart.create | 2 | 1/1 | Tested |');
    expect(output).toContain('| cart.addItem | 0 | 0/2 | Untested |');
    expect(output).toContain('Contract coverage: 1/2 (50.0%)');
    expect(output).toContain('Error tag coverage: 1/3 (33.3%)');
  });

  test('renders with Japanese locale', () => {
    const output = renderCoverageSummary(report, ja);
    expect(output).toContain('## テスト網羅性');
    expect(output).toContain('テスト済');
    expect(output).toContain('未テスト');
    expect(output).toContain('Contract網羅率');
  });

  test('shows dash for contract with no error tags', () => {
    const simpleReport: CoverageReport = {
      contracts: [
        {
          contractId: 'test.op',
          hasTests: true,
          testCount: 1,
          totalErrorTags: 0,
          coveredErrorTags: 0,
          uncoveredErrorTags: [],
        },
      ],
      summary: {
        totalContracts: 1,
        testedContracts: 1,
        contractCoveragePercent: 100,
        totalErrorTags: 0,
        coveredErrorTags: 0,
        errorTagCoveragePercent: 100,
      },
    };

    const output = renderCoverageSummary(simpleReport, en);
    expect(output).toContain('| test.op | 1 | - | Tested |');
  });
});
