export interface ErrorTagCoverage {
  readonly tag: string;
  readonly guardIndex: number;
  readonly hasFailureTest: boolean;
  readonly matchingTestName: string | undefined;
}

export interface ContractCoverage {
  readonly contractName: string;
  readonly hasTests: boolean;
  readonly testCount: number;
  readonly successTestCount: number;
  readonly failureTestCount: number;
  readonly errorTags: readonly ErrorTagCoverage[];
  readonly coveredErrorTags: number;
  readonly totalErrorTags: number;
}

export interface CoverageReport {
  readonly contracts: readonly ContractCoverage[];
  readonly summary: {
    readonly totalContracts: number;
    readonly testedContracts: number;
    readonly untestedContracts: number;
    readonly contractCoveragePercent: number;
    readonly totalErrorTags: number;
    readonly coveredErrorTags: number;
    readonly errorTagCoveragePercent: number;
  };
}
