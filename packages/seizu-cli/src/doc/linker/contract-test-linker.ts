import type { LinkedContract, ParsedContract, ParsedTestSuite } from '../types';

/**
 * Link parsed contracts to their test suites by matching contract ID
 * to the describe block's label string.
 */
export function linkContractsToTests(
  contracts: readonly ParsedContract[],
  testSuites: readonly ParsedTestSuite[]
): LinkedContract[] {
  // Build a map of contractName -> test suites (may have multiple files)
  const suiteMap = new Map<string, ParsedTestSuite>();

  for (const suite of testSuites) {
    const existing = suiteMap.get(suite.contractName);
    if (existing) {
      // Merge test cases from multiple files
      suiteMap.set(suite.contractName, {
        ...existing,
        tests: [...existing.tests, ...suite.tests],
      });
    } else {
      suiteMap.set(suite.contractName, suite);
    }
  }

  return contracts.map((contract) => ({
    contract,
    testSuite: suiteMap.get(contract.name),
  }));
}
