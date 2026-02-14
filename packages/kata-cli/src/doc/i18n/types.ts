export type Locale = 'en' | 'ja';

export interface Messages {
  readonly toc: {
    readonly title: string;
    readonly meta: (guardCount: number, testCount: number) => string;
  };
  readonly typeTable: {
    readonly headerItem: string;
    readonly headerType: string;
    readonly state: string;
    readonly input: string;
    readonly error: string;
  };
  readonly preconditions: {
    readonly title: string;
    readonly description: string;
    readonly columnCondition: string;
    readonly columnError: string;
  };
  readonly postconditions: {
    readonly title: string;
    readonly description: string;
    readonly columnCondition: string;
  };
  readonly invariants: {
    readonly title: string;
    readonly description: string;
    readonly columnCondition: string;
  };
  readonly errorCatalog: {
    readonly title: string;
    readonly noErrors: string;
    readonly columnTag: string;
    readonly columnSource: string;
    readonly sourceRef: (index: number) => string;
  };
  readonly testExamples: {
    readonly title: string;
    readonly description: string;
    readonly noTests: string;
    readonly columnScenario: string;
    readonly columnExpected: string;
  };
  readonly testResult: {
    readonly success: string;
    readonly errorTag: (tag: string) => string;
    readonly errorGeneric: string;
  };
  readonly coverage: {
    readonly title: string;
    readonly description: string;
    readonly columnContract: string;
    readonly columnTests: string;
    readonly columnErrorCoverage: string;
    readonly columnStatus: string;
    readonly tested: string;
    readonly untested: string;
    readonly summaryContract: (
      tested: number,
      total: number,
      pct: number
    ) => string;
    readonly summaryErrorTag: (
      covered: number,
      total: number,
      pct: number
    ) => string;
  };
  readonly scenarios: {
    readonly sectionTitle: string;
    readonly sectionDescription: string;
    readonly columnStep: string;
    readonly columnOperation: string;
    readonly columnInput: string;
    readonly columnExpected: string;
    readonly expectOk: string;
    readonly expectError: (tag: string) => string;
    readonly noScenarios: string;
  };
  readonly contractDetail: {
    readonly sectionTitle: string;
  };
  readonly noDefined: string;
  readonly noDescription: string;
}
