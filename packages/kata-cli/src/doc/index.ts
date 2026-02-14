import { resolve } from 'node:path';
import { analyzeCoverage } from './analyzer/coverage-analyzer';
import { getMessages } from './i18n/index';
import { linkContractsToTests } from './linker/contract-test-linker';
import { parseContracts } from './parser/contract-parser';
import { createProgramFromFiles, resolveGlobs } from './parser/source-resolver';
import { parseTestSuites } from './parser/test-parser';
import { renderMarkdown } from './renderer/markdown';
import type {
  DocumentModel,
  KataDocConfig,
  ParsedContract,
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
export type { DocumentModel, KataDocConfig } from './types';

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
  const testFiles = config.tests ? resolveGlobs(config.tests, basePath) : [];

  const allFiles = [...contractFiles, ...testFiles];
  if (allFiles.length === 0) {
    return renderMarkdown(
      {
        title: config.title,
        description: config.description,
        contracts: [],
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

  const model: DocumentModel = {
    title: config.title,
    description: config.description,
    contracts: linkedContracts,
    sourceFiles: allFiles,
  };

  const coverageReport = config.coverage
    ? analyzeCoverage(linkedContracts)
    : undefined;

  return renderMarkdown(model, { messages, coverageReport });
}
