import { resolve } from 'node:path';
import type { CAC } from 'cac';
import { formatCoverageReport } from '../coverage/reporters/terminal';
import { analyzeCoverage } from '../doc/analyzer/coverage-analyzer';
import { ConfigError, loadConfig } from '../doc/config';
import { getMessages } from '../doc/i18n/index';
import type { Locale } from '../doc/i18n/types';
import { linkContractsToTests } from '../doc/linker/contract-test-linker';
import { parseContracts } from '../doc/parser/contract-parser';
import {
  createProgramFromFiles,
  resolveGlobs,
} from '../doc/parser/source-resolver';
import { parseTestSuites } from '../doc/parser/test-parser';
import type { ParsedContract, ParsedTestSuite } from '../doc/types';

export function registerCoverageCommand(cli: CAC): void {
  cli
    .command('coverage [...contracts]', 'Analyze test coverage for contracts')
    .option('--config <path>', 'Config file path', {
      default: 'kata-doc.config.ts',
    })
    .option('--locale <locale>', 'Locale: en or ja', { default: 'en' })
    .option('--json', 'Output as JSON', { default: false })
    .action(async (contracts: string[], options) => {
      try {
        const { config } = await loadConfig(options.config);
        const locale = (options.locale ?? config.locale ?? 'en') as Locale;
        const messages = getMessages(locale);
        const basePath = process.cwd();

        const contractFiles = resolveGlobs(config.contracts, basePath);
        const testFiles = config.tests
          ? resolveGlobs(config.tests, basePath)
          : [];

        const allFiles = [...contractFiles, ...testFiles];
        if (allFiles.length === 0) {
          console.log('No source files found.');
          process.exit(0);
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

        if (contracts.length > 0) {
          const filterSet = new Set(contracts);
          allContracts = allContracts.filter((c) => filterSet.has(c.id));
        }

        const linked = linkContractsToTests(allContracts, allTestSuites);
        const report = analyzeCoverage(linked);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatCoverageReport(report, messages));
        }

        process.exit(0);
      } catch (error) {
        if (error instanceof ConfigError) {
          console.error(`Configuration error: ${error.message}`);
          process.exit(2);
        }
        throw error;
      }
    });
}
