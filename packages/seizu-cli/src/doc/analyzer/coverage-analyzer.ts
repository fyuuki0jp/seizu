import type { LinkedContract } from '../types';
import type {
  ContractCoverage,
  CoverageReport,
  ErrorTagCoverage,
} from './coverage-types';

/**
 * Analyze test coverage for linked contracts.
 * Checks contract-level coverage (has any tests?) and
 * error-tag-level coverage (each error tag has a failure test?).
 */
export function analyzeCoverage(
  linked: readonly LinkedContract[]
): CoverageReport {
  const contracts = linked.map(analyzeContract);

  const totalContracts = contracts.length;
  const testedContracts = contracts.filter((c) => c.hasTests).length;
  const untestedContracts = totalContracts - testedContracts;
  const contractCoveragePercent = toPercent(testedContracts, totalContracts);

  const totalErrorTags = contracts.reduce(
    (sum, c) => sum + c.totalErrorTags,
    0
  );
  const coveredErrorTags = contracts.reduce(
    (sum, c) => sum + c.coveredErrorTags,
    0
  );
  const errorTagCoveragePercent = toPercent(coveredErrorTags, totalErrorTags);

  return {
    contracts,
    summary: {
      totalContracts,
      testedContracts,
      untestedContracts,
      contractCoveragePercent,
      totalErrorTags,
      coveredErrorTags,
      errorTagCoveragePercent,
    },
  };
}

function toPercent(covered: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((covered / total) * 1000) / 10;
}

function analyzeContract(linked: LinkedContract): ContractCoverage {
  const { contract, testSuite } = linked;
  const tests = testSuite?.tests ?? [];
  const hasTests = tests.length > 0;

  const successTestCount = tests.filter(
    (t) => t.classification === 'success'
  ).length;
  const failureTestCount = tests.filter(
    (t) => t.classification === 'failure'
  ).length;

  // Collect all unique error tags from guards
  const allTags: { tag: string; guardIndex: number }[] = [];
  for (const guard of contract.guards) {
    for (const tag of guard.errorTags) {
      allTags.push({ tag, guardIndex: guard.index });
    }
  }

  const errorTags: ErrorTagCoverage[] = allTags.map(({ tag, guardIndex }) => {
    const matchingTest = tests.find(
      (t) =>
        t.classification === 'failure' &&
        t.name.toLowerCase().includes(tag.toLowerCase())
    );
    return {
      tag,
      guardIndex,
      hasFailureTest: matchingTest !== undefined,
      matchingTestName: matchingTest?.name,
    };
  });

  const coveredErrorTags = errorTags.filter((e) => e.hasFailureTest).length;

  return {
    contractName: contract.name,
    hasTests,
    testCount: tests.length,
    successTestCount,
    failureTestCount,
    errorTags,
    coveredErrorTags,
    totalErrorTags: errorTags.length,
  };
}
