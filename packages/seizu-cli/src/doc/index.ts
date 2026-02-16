import { resolve } from 'node:path';
import { isOk } from 'seizu';
import { docGenerate } from '../domain/pipeline';
import type { DocPipelineState, SourceFileEntry } from '../domain/types';
import { getMessages } from './i18n/index';
import {
  createProgramFromFiles,
  isExcluded,
  resolveGlobs,
} from './parser/source-resolver';
import { renderMarkdown } from './renderer/markdown';
import type { SeizuDocConfig } from './types';
import { validateContracts } from './validator';

export { ConfigError, loadConfig } from '../config';
export { analyzeCoverage } from './analyzer/coverage-analyzer';
export type {
  ContractCoverage,
  CoverageReport,
  ErrorTagCoverage,
} from './analyzer/coverage-types';
export type {
  FlowArtifact,
  FlowEdge,
  FlowGraph,
  FlowNode,
  FlowNodeKind,
  FlowOwnerKind,
  FlowSummary,
} from './flow';
export { getMessages } from './i18n/index';
export type { Locale, Messages } from './i18n/types';
export type {
  DocumentModel,
  LinkedScenario,
  SeizuConfig,
  SeizuDocConfig,
  SeizuVerifyConfig,
} from './types';
export type { Diagnostic } from './validator';
export { validateContracts } from './validator';

export interface GenerateOptions {
  readonly filterIds?: readonly string[];
}

/**
 * Generate Markdown documentation from seizu contract sources and tests.
 */
export function generate(
  config: SeizuDocConfig,
  options?: GenerateOptions
): string {
  const basePath = process.cwd();
  const messages = getMessages(config.locale ?? 'en');

  const excludePatterns = config.exclude ?? [];
  const notExcluded = (f: string) => !isExcluded(f, excludePatterns, basePath);
  const contractFiles = resolveGlobs(config.contracts, basePath).filter(
    notExcluded
  );
  const scenarioFiles = config.scenarios
    ? resolveGlobs(config.scenarios, basePath).filter(notExcluded)
    : [];
  const testFiles = config.tests
    ? resolveGlobs(config.tests, basePath).filter(notExcluded)
    : [];

  const allFiles = [...contractFiles, ...scenarioFiles, ...testFiles];
  const flowEnabled = config.flow ?? true;

  if (allFiles.length === 0) {
    const renderResult = renderMarkdown(
      {
        title: config.title,
        description: config.description,
        contracts: [],
        scenarios: [],
        sourceFiles: [],
      },
      {
        messages,
        flowEnabled,
      }
    );
    if (!isOk(renderResult)) {
      throw new Error(
        `Render failed at step ${renderResult.error.stepIndex}: ${renderResult.error.contractName}`
      );
    }
    return renderResult.value;
  }

  const tsconfigPath = config.tsconfig
    ? resolve(basePath, config.tsconfig)
    : undefined;
  const program = createProgramFromFiles(allFiles, tsconfigPath);

  const sourceFiles: SourceFileEntry[] = [];
  for (const path of contractFiles) {
    const sf = program.getSourceFile(path);
    if (sf) {
      sourceFiles.push({ path, kind: 'contract', sourceFile: sf });
    }
  }

  const scenarioSources = new Set([...scenarioFiles, ...contractFiles]);
  for (const path of scenarioSources) {
    const sf = program.getSourceFile(path);
    if (sf) {
      sourceFiles.push({ path, kind: 'scenario', sourceFile: sf });
    }
  }

  for (const path of testFiles) {
    const sf = program.getSourceFile(path);
    if (sf) {
      sourceFiles.push({ path, kind: 'test', sourceFile: sf });
    }
  }

  const filterIds =
    options?.filterIds && options.filterIds.length > 0
      ? new Set(options.filterIds)
      : undefined;

  const initialState: DocPipelineState = {
    title: config.title,
    description: config.description,
    flowEnabled,
    messages,
    sourceFiles: [],
    contracts: [],
    scenarios: [],
    testSuites: [],
    filtered: [],
    linked: [],
    linkedScenarios: [],
    coverageReport: undefined,
    markdown: '',
  };

  const result = docGenerate(initialState, {
    sourceFiles,
    filterIds,
    coverageEnabled: config.coverage ?? false,
  });

  if (!isOk(result)) {
    throw new Error(
      `Pipeline failed at step ${result.error.stepIndex}: ${result.error.contractName}`
    );
  }

  const diagnostics = validateContracts(result.value.contracts);
  for (const d of diagnostics) {
    console.error(`[${d.level}] ${d.contractName}: ${d.message}`);
  }

  return result.value.markdown;
}
