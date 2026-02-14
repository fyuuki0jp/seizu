import type { Messages } from './types';

export const en: Messages = {
  toc: {
    title: 'Table of Contents',
    meta: (guardCount, testCount) =>
      `Preconditions: ${guardCount}, Tests: ${testCount}`,
  },
  typeTable: {
    headerItem: 'Property',
    headerType: 'Type',
    state: 'State',
    input: 'Input',
    error: 'Error',
  },
  preconditions: {
    title: 'Preconditions',
    description:
      'Conditions that must be satisfied before this operation can execute. If a condition is not met, the corresponding error is returned.',
    columnCondition: 'Condition',
    columnError: 'Error',
  },
  postconditions: {
    title: 'Postconditions',
    description:
      'Conditions guaranteed to hold after this operation completes successfully.',
    columnCondition: 'Condition',
  },
  invariants: {
    title: 'Invariants',
    description:
      'Conditions that must hold both before and after this operation.',
    columnCondition: 'Condition',
  },
  errorCatalog: {
    title: 'Error Catalog',
    noErrors: '_No errors defined_',
    columnTag: 'Error Tag',
    columnSource: 'Source',
    sourceRef: (index) => `Precondition #${index}`,
  },
  testExamples: {
    title: 'Test Cases',
    description: 'Test scenarios that verify the behavior of this operation.',
    noTests: "_No tests found. Add a `describe('contract.id', ...)` block._",
    columnScenario: 'Scenario',
    columnExpected: 'Expected Result',
  },
  testResult: {
    success: 'Succeeds',
    errorTag: (tag) => `Error: \`${tag}\``,
    errorGeneric: 'Returns error',
  },
  coverage: {
    title: 'Test Coverage',
    description: 'Test coverage status for each contract.',
    columnContract: 'Contract',
    columnTests: 'Tests',
    columnErrorCoverage: 'Error Tag Coverage',
    columnStatus: 'Status',
    tested: 'Tested',
    untested: 'Untested',
    summaryContract: (tested, total, pct) =>
      `Contract coverage: ${tested}/${total} (${pct.toFixed(1)}%)`,
    summaryErrorTag: (covered, total, pct) =>
      `Error tag coverage: ${covered}/${total} (${pct.toFixed(1)}%)`,
  },
  scenarios: {
    sectionTitle: 'Scenarios',
    sectionDescription:
      'Business workflows composed from multiple contract operations.',
    columnStep: '#',
    columnOperation: 'Operation',
    columnInput: 'Input',
    columnExpected: 'Expected',
    expectOk: 'Success',
    expectError: (tag) => `Error: \`${tag}\``,
    noScenarios: '_No scenarios defined_',
  },
  contractDetail: {
    sectionTitle: 'Contract Details',
  },
  noDefined: '_Not defined_',
  noDescription: '_No description (add a TSDoc comment)_',
};
