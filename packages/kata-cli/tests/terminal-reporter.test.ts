import { describe, expect, test } from 'vitest';
import { formatCoverageReport } from '../src/coverage/reporters/terminal';
import type { CoverageReport } from '../src/doc/analyzer/coverage-types';
import { getMessages } from '../src/doc/i18n/index';

const en = getMessages('en');
const ja = getMessages('ja');

describe('formatCoverageReport', () => {
  const report: CoverageReport = {
    contracts: [
      {
        contractName: 'cart.create',
        hasTests: true,
        testCount: 2,
        totalErrorTags: 1,
        coveredErrorTags: 1,
        uncoveredErrorTags: [],
      },
      {
        contractName: 'cart.addItem',
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

  test('formats report with English messages', () => {
    const output = formatCoverageReport(report, en);
    expect(output).toContain('=== Test Coverage ===');
    expect(output).toContain('cart.create');
    expect(output).toContain('[Tested]');
    expect(output).toContain('tests: 2');
    expect(output).toContain('1/1');
    expect(output).toContain('cart.addItem');
    expect(output).toContain('[Untested]');
    expect(output).toContain('0/2');
    expect(output).toContain('Contract coverage: 1/2');
    expect(output).toContain('Error tag coverage: 1/3');
  });

  test('formats report with Japanese messages', () => {
    const output = formatCoverageReport(report, ja);
    expect(output).toContain('=== テスト網羅性 ===');
    expect(output).toContain('[テスト済]');
    expect(output).toContain('[未テスト]');
    expect(output).toContain('Contract網羅率');
    expect(output).toContain('エラータグ網羅率');
  });

  test('shows dash for contracts with no error tags', () => {
    const noErrorReport: CoverageReport = {
      contracts: [
        {
          contractName: 'simple.op',
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

    const output = formatCoverageReport(noErrorReport, en);
    expect(output).toContain('errors: -');
  });
});
