import { define, err, isOk, pass, scenario, step } from 'kata';
import { analyzeCoverage } from '../doc/analyzer/coverage-analyzer';
import { linkContractsToTests } from '../doc/linker/contract-test-linker';
import { linkScenarios } from '../doc/linker/scenario-linker';
import { parseContracts } from '../doc/parser/contract-parser';
import { parseScenarios } from '../doc/parser/scenario-parser';
import { parseTestSuites } from '../doc/parser/test-parser';
import type {
  ParsedContract,
  ParsedScenario,
  ParsedTestSuite,
} from '../doc/types';
import {
  renderContractSections,
  renderCoverageSection,
  renderMarkdownScenario,
} from './render';
import type {
  AnalyzeInput,
  CoverageGenerateInput,
  DocPipelineState,
  FilterInput,
  GenerateInput,
  ParseInput,
  PipelineError,
} from './types';

// === doc.parse ===

export const docParse = define<DocPipelineState, ParseInput, PipelineError>({
  id: 'doc.parse',
  pre: [
    /** Source files must not be empty */
    (_, input) =>
      input.sourceFiles.length > 0
        ? pass
        : err({ tag: 'NoSourceFiles' as const }),
  ],
  transition: (state, input) => {
    const contracts: ParsedContract[] = [];
    const scenarios: ParsedScenario[] = [];
    const testSuites: ParsedTestSuite[] = [];
    const sourceFilePaths: string[] = [];

    for (const entry of input.sourceFiles) {
      sourceFilePaths.push(entry.path);
      switch (entry.kind) {
        case 'contract':
          contracts.push(...parseContracts(entry.sourceFile));
          break;
        case 'scenario':
          scenarios.push(...parseScenarios(entry.sourceFile));
          break;
        case 'test':
          testSuites.push(...parseTestSuites(entry.sourceFile));
          break;
      }
    }

    return {
      ...state,
      sourceFiles: [...new Set(sourceFilePaths)],
      contracts,
      scenarios,
      testSuites,
    };
  },
  post: [
    /** Source file paths are tracked uniquely in the pipeline state. */
    (_before, after, input) =>
      after.sourceFiles.length ===
      new Set(input.sourceFiles.map((entry) => entry.path)).size,
  ],
});

// === doc.filter ===

export const docFilter = define<DocPipelineState, FilterInput, never>({
  id: 'doc.filter',
  pre: [],
  transition: (state, input) => {
    if (input.filterIds && input.filterIds.size > 0) {
      return {
        ...state,
        filtered: state.contracts.filter(
          (c) => input.filterIds?.has(c.id) ?? false
        ),
      };
    }
    return { ...state, filtered: [...state.contracts] };
  },
  post: [
    /** Filtered contracts are a subset of all contracts */
    (_before, after) =>
      after.filtered.every((f) => after.contracts.some((c) => c.id === f.id)),
  ],
});

// === doc.link ===

export const docLink = define<DocPipelineState, Record<string, never>, never>({
  id: 'doc.link',
  pre: [],
  transition: (state) => {
    const linked = linkContractsToTests(state.filtered, state.testSuites);
    const linkedScenarios = linkScenarios(state.scenarios, state.filtered);
    return { ...state, linked, linkedScenarios };
  },
  post: [
    /** Every filtered contract has a corresponding linked entry */
    (_before, after) => after.linked.length === after.filtered.length,
  ],
});

// === doc.analyze ===

export const docAnalyze = define<DocPipelineState, AnalyzeInput, never>({
  id: 'doc.analyze',
  pre: [],
  transition: (state, input) => {
    if (!input.enabled) {
      return state;
    }
    const coverageReport = analyzeCoverage(state.linked);
    return { ...state, coverageReport };
  },
  post: [
    /** Coverage report is present when analysis is enabled */
    (_before, after, input) =>
      input.enabled ? after.coverageReport !== undefined : true,
  ],
});

// === doc.render ===

export const docRender = define<DocPipelineState, Record<string, never>, never>(
  {
    id: 'doc.render',
    pre: [],
    transition: (state) => {
      const result = renderMarkdownScenario([], {
        title: state.title,
        description: state.description,
        flowEnabled: state.flowEnabled,
        contracts: state.linked,
        scenarios: state.linkedScenarios,
        messages: state.messages,
      });

      if (!isOk(result)) {
        throw new Error(
          `render.markdown failed at step ${result.error.stepIndex}: ${result.error.contractId}`
        );
      }

      let lines = renderContractSections(result.value, {
        contracts: state.linked,
        hasScenarios: state.linkedScenarios.length > 0,
        messages: state.messages,
        flowEnabled: state.flowEnabled,
      });

      if (state.coverageReport) {
        lines = renderCoverageSection(lines, {
          report: state.coverageReport,
          messages: state.messages,
        });
      }

      const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n');
      return { ...state, markdown };
    },
    post: [
      /** Non-empty linked state produces non-empty markdown */
      (_before, after) =>
        after.linked.length > 0 ? after.markdown.length > 0 : true,
    ],
  }
);

// === doc.generate scenario ===

export const docGenerate = scenario<DocPipelineState, GenerateInput>({
  id: 'doc.generate',
  description: 'ドキュメント生成パイプライン',
  flow: (input) => [
    step(docParse, { sourceFiles: input.sourceFiles }),
    step(docFilter, {
      filterIds: input.filterIds,
    } as FilterInput),
    step(docLink, {} as Record<string, never>),
    step(docAnalyze, { enabled: input.coverageEnabled }),
    step(docRender, {} as Record<string, never>),
  ],
});

// === coverage.generate scenario ===

export const coverageGenerate = scenario<
  DocPipelineState,
  CoverageGenerateInput
>({
  id: 'coverage.generate',
  description: 'カバレッジ分析パイプライン',
  flow: (input) => [
    step(docParse, { sourceFiles: input.sourceFiles }),
    step(docFilter, {
      filterIds: input.filterIds,
    } as FilterInput),
    step(docLink, {} as Record<string, never>),
    step(docAnalyze, { enabled: true }),
  ],
});
