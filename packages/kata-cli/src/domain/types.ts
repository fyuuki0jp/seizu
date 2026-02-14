import type { VerifyResult } from 'kata/verify';
import type ts from 'typescript';
import type { CoverageReport } from '../doc/analyzer/coverage-types';
import type { Messages } from '../doc/i18n/types';
import type {
  LinkedContract,
  LinkedScenario,
  ParsedContract,
  ParsedScenario,
  ParsedTestSuite,
} from '../doc/types';

// === Source File Entry (IO → Pure bridge) ===

export interface SourceFileEntry {
  readonly path: string;
  readonly kind: 'contract' | 'scenario' | 'test';
  readonly sourceFile: ts.SourceFile;
}

// === Pipeline State ===

export interface DocPipelineState {
  readonly title: string;
  readonly description: string | undefined;
  readonly messages: Messages;
  readonly sourceFiles: readonly string[];
  readonly contracts: readonly ParsedContract[];
  readonly scenarios: readonly ParsedScenario[];
  readonly testSuites: readonly ParsedTestSuite[];
  readonly filtered: readonly ParsedContract[];
  readonly linked: readonly LinkedContract[];
  readonly linkedScenarios: readonly LinkedScenario[];
  readonly coverageReport: CoverageReport | undefined;
  readonly markdown: string;
}

// === Pipeline Errors ===

export type PipelineError = { readonly tag: 'NoSourceFiles' };

// === Render Errors ===

export type RenderError =
  | { readonly tag: 'TitleEmpty' }
  | { readonly tag: 'InsufficientContracts' }
  | { readonly tag: 'NoScenarios' }
  | { readonly tag: 'NoReport' };

// === Reporter Errors ===

export type ReporterError =
  | { readonly tag: 'NoResults' }
  | { readonly tag: 'NoFailures' };

// === Pipeline Input Types ===

export interface ParseInput {
  readonly sourceFiles: readonly SourceFileEntry[];
}

export interface FilterInput {
  readonly filterIds?: ReadonlySet<string>;
}

export interface AnalyzeInput {
  readonly enabled: boolean;
}

export interface GenerateInput {
  readonly sourceFiles: readonly SourceFileEntry[];
  readonly filterIds?: ReadonlySet<string>;
  readonly coverageEnabled: boolean;
}

// === Render Input Types ===

export interface TitleInput {
  readonly title: string;
  readonly description: string | undefined;
}

export interface TocInput {
  readonly contracts: readonly LinkedContract[];
  readonly messages: Messages;
}

export interface ScenarioSectionInput {
  readonly scenarios: readonly LinkedScenario[];
  readonly messages: Messages;
}

export interface ContractHeaderInput {
  readonly linked: LinkedContract;
  readonly messages: Messages;
}

export interface PreconditionsInput {
  readonly guards: LinkedContract['contract']['guards'];
  readonly messages: Messages;
}

export interface PostconditionsInput {
  readonly conditions: LinkedContract['contract']['conditions'];
  readonly messages: Messages;
}

export interface InvariantsInput {
  readonly invariants: LinkedContract['contract']['invariants'];
  readonly messages: Messages;
}

export interface ErrorCatalogInput {
  readonly guards: LinkedContract['contract']['guards'];
  readonly messages: Messages;
}

export interface TestExamplesInput {
  readonly tests: LinkedContract['testSuite'];
  readonly messages: Messages;
}

export interface CoverageSectionInput {
  readonly report: CoverageReport;
  readonly messages: Messages;
}

export interface ContractDetailInput {
  readonly contracts: readonly LinkedContract[];
  readonly hasScenarios: boolean;
  readonly messages: Messages;
}

export interface MarkdownInput {
  readonly title: string;
  readonly description: string | undefined;
  readonly contracts: readonly LinkedContract[];
  readonly scenarios: readonly LinkedScenario[];
  readonly messages: Messages;
  readonly coverageReport: CoverageReport | undefined;
}

// === Reporter Input Types ===

export interface ReporterInput {
  readonly result: VerifyResult;
}
