// ===== Parsed Contract Model =====

export interface ParsedTypeInfo {
  readonly stateTypeName: string;
  readonly inputTypeName: string;
  readonly errorTypeName: string;
}

export interface ParsedGuard {
  readonly index: number;
  readonly description: string | undefined;
  readonly errorTags: readonly string[];
  readonly kind: 'inline' | 'reference';
  readonly referenceName: string | undefined;
}

export interface ParsedCondition {
  readonly index: number;
  readonly description: string | undefined;
  readonly kind: 'inline' | 'reference';
  readonly referenceName: string | undefined;
}

export interface ParsedInvariant {
  readonly index: number;
  readonly description: string | undefined;
  readonly kind: 'inline' | 'reference';
  readonly referenceName: string | undefined;
}

export interface ParsedContract {
  readonly id: string;
  readonly description: string | undefined;
  readonly typeInfo: ParsedTypeInfo;
  readonly guards: readonly ParsedGuard[];
  readonly conditions: readonly ParsedCondition[];
  readonly invariants: readonly ParsedInvariant[];
  readonly variableName: string | undefined;
  readonly sourceFile: string;
  readonly line: number;
}

// ===== Parsed Test Model =====

export type TestClassification = 'success' | 'failure' | 'unknown';

export interface ParsedTestCase {
  readonly name: string;
  readonly classification: TestClassification;
  readonly sourceFile: string;
  readonly line: number;
}

export interface ParsedTestSuite {
  readonly contractId: string;
  readonly tests: readonly ParsedTestCase[];
  readonly sourceFile: string;
}

// ===== Parsed Scenario Model =====

export interface ParsedScenarioStep {
  readonly index: number;
  readonly contractId: string;
  readonly inputLiteral: string;
}

export interface ParsedScenario {
  readonly id: string;
  readonly description: string | undefined;
  readonly variableName: string | undefined;
  readonly steps: readonly ParsedScenarioStep[];
  readonly sourceFile: string;
  readonly line: number;
}

// ===== Linked Document Model =====

export interface LinkedContract {
  readonly contract: ParsedContract;
  readonly testSuite: ParsedTestSuite | undefined;
}

export interface LinkedScenario {
  readonly scenario: ParsedScenario;
  readonly resolvedSteps: ReadonlyArray<{
    readonly step: ParsedScenarioStep;
    readonly contract: ParsedContract | undefined;
  }>;
}

export interface DocumentModel {
  readonly title: string;
  readonly description: string | undefined;
  readonly contracts: readonly LinkedContract[];
  readonly scenarios: readonly LinkedScenario[];
  readonly sourceFiles: readonly string[];
}

// ===== Configuration =====

import type { Locale } from './i18n/types';

export interface KataDocConfig {
  readonly title: string;
  readonly description?: string;
  readonly contracts: readonly string[];
  readonly scenarios?: readonly string[];
  readonly tests?: readonly string[];
  readonly output?: string;
  readonly tsconfig?: string;
  readonly locale?: Locale;
  readonly coverage?: boolean;
}
