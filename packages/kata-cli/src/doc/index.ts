import { resolve } from 'node:path';
import { analyzeCoverage } from './analyzer/coverage-analyzer';
import { getMessages } from './i18n/index';
import { linkContractsToTests } from './linker/contract-test-linker';
import { linkScenarios } from './linker/scenario-linker';
import { parseContracts } from './parser/contract-parser';
import { parseScenarios } from './parser/scenario-parser';
import { createProgramFromFiles, resolveGlobs } from './parser/source-resolver';
import { parseTestSuites } from './parser/test-parser';
import { renderMarkdown } from './renderer/markdown';
import type {
  DocumentModel,
  KataDocConfig,
  LinkedScenario,
  ParsedContract,
  ParsedScenario,
  ParsedTestSuite,
} from './types';

export { analyzeCoverage } from './analyzer/coverage-analyzer';
export type {
  ContractCoverage,
  CoverageReport,
  ErrorTagCoverage,
} from './analyzer/coverage-types';
export { ConfigError, loadConfig } from './config';
export { getMessages } from './i18n/index';
export type { Locale, Messages } from './i18n/types';
export type { DocumentModel, KataDocConfig, LinkedScenario } from './types';

export interface GenerateOptions {
  readonly filterIds?: readonly string[];
}

/**
 * Generate Markdown documentation from kata contract sources and tests.
 */
export function generate(
  config: KataDocConfig,
  options?: GenerateOptions
): string {
  const basePath = process.cwd();
  const messages = getMessages(config.locale ?? 'en');

  const contractFiles = resolveGlobs(config.contracts, basePath);
  const scenarioFiles = config.scenarios
    ? resolveGlobs(config.scenarios, basePath)
    : [];
  const testFiles = config.tests ? resolveGlobs(config.tests, basePath) : [];

  const allFiles = [...contractFiles, ...scenarioFiles, ...testFiles];
  if (allFiles.length === 0) {
    return renderMarkdown(
      {
        title: config.title,
        description: config.description,
        contracts: [],
        scenarios: [],
        sourceFiles: [],
      },
      { messages }
    );
  }

  const tsconfigPath = config.tsconfig
    ? resolve(basePath, config.tsconfig)
    : undefined;
  const program = createProgramFromFiles(allFiles, tsconfigPath);

  let allContracts: ParsedContract[] = [];
  for (const filePath of contractFiles) {
    const sourceFile = program.getSourceFile(filePath);
    if (sourceFile) {
      allContracts.push(...parseContracts(sourceFile));
    }
  }

  // Parse scenarios from both scenario files and contract files
  const allScenarios: ParsedScenario[] = [];
  const scenarioSources = new Set([...scenarioFiles, ...contractFiles]);
  for (const filePath of scenarioSources) {
    const sourceFile = program.getSourceFile(filePath);
    if (sourceFile) {
      allScenarios.push(...parseScenarios(sourceFile));
    }
  }

  const allTestSuites: ParsedTestSuite[] = [];
  for (const filePath of testFiles) {
    const sourceFile = program.getSourceFile(filePath);
    if (sourceFile) {
      allTestSuites.push(...parseTestSuites(sourceFile));
    }
  }

  if (options?.filterIds && options.filterIds.length > 0) {
    const filterSet = new Set(options.filterIds);
    allContracts = allContracts.filter((c) => filterSet.has(c.id));
  }

  const linkedContracts = linkContractsToTests(allContracts, allTestSuites);
  const linkedScenarios: LinkedScenario[] = linkScenarios(
    allScenarios,
    allContracts
  );

  const model: DocumentModel = {
    title: config.title,
    description: config.description,
    contracts: linkedContracts,
    scenarios: linkedScenarios,
    sourceFiles: allFiles,
  };

  const coverageReport = config.coverage
    ? analyzeCoverage(linkedContracts)
    : undefined;

  return renderMarkdown(model, { messages, coverageReport });
}
