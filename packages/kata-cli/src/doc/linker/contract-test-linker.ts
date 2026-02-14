import type { LinkedContract, ParsedContract, ParsedTestSuite } from '../types';

/**
 * Link parsed contracts to their test suites by matching contract ID
 * to the describe block's label string.
 */
export function linkContractsToTests(
  contracts: readonly ParsedContract[],
  testSuites: readonly ParsedTestSuite[]
): LinkedContract[] {
  // Build a map of contractId -> test suites (may have multiple files)
  const suiteMap = new Map<string, ParsedTestSuite>();

  for (const suite of testSuites) {
    const existing = suiteMap.get(suite.contractId);
    if (existing) {
      // Merge test cases from multiple files
      suiteMap.set(suite.contractId, {
        ...existing,
        tests: [...existing.tests, ...suite.tests],
      });
    } else {
      suiteMap.set(suite.contractId, suite);
    }
  }

  return contracts.map((contract) => ({
    contract,
    testSuite: suiteMap.get(contract.id),
  }));
}
