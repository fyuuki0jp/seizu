import type { ContractEntry } from 'kata/verify';
import type { FlowArtifact } from './flow';
import type { Locale } from './i18n/types';

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
  readonly name: string;
  readonly accepts: readonly string[];
  readonly description: string | undefined;
  readonly typeInfo: ParsedTypeInfo;
  readonly guards: readonly ParsedGuard[];
  readonly conditions: readonly ParsedCondition[];
  readonly invariants: readonly ParsedInvariant[];
  readonly flow?: FlowArtifact;
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
  readonly contractName: string;
  readonly tests: readonly ParsedTestCase[];
  readonly sourceFile: string;
}

// ===== Parsed Scenario Model =====

export interface ParsedScenarioStep {
  readonly index: number;
  readonly contractName: string;
  readonly inputLiteral: string;
}

export interface ParsedScenario {
  readonly name: string;
  readonly accepts: readonly string[];
  readonly description: string | undefined;
  readonly variableName: string | undefined;
  readonly steps: readonly ParsedScenarioStep[];
  readonly flow?: FlowArtifact;
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
  readonly flow?: boolean;
  readonly flowDebugOutput?: string;
}

export interface KataVerifyConfig {
  readonly contracts: readonly ContractEntry[];
}

export interface KataConfig extends KataDocConfig {
  readonly verify: KataVerifyConfig;
}
