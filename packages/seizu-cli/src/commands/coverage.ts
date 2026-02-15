import { resolve } from 'node:path';
import type { CAC } from 'cac';
import { isOk } from 'seizu';
import { ConfigError, loadConfig } from '../config';
import { formatCoverageReport } from '../coverage/reporters/terminal';
import { getMessages } from '../doc/i18n/index';
import type { Locale } from '../doc/i18n/types';
import {
  createProgramFromFiles,
  resolveGlobs,
} from '../doc/parser/source-resolver';
import { coverageGenerate } from '../domain/pipeline';
import type { DocPipelineState, SourceFileEntry } from '../domain/types';

export function registerCoverageCommand(cli: CAC): void {
  cli
    .command('coverage [...contracts]', 'Analyze test coverage for contracts')
    .option('--config <path>', 'Config file path', {
      default: 'seizu.config.ts',
    })
    .option('--locale <locale>', 'Locale: en or ja')
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
          return;
        }

        const tsconfigPath = config.tsconfig
          ? resolve(basePath, config.tsconfig)
          : undefined;
        const program = createProgramFromFiles(allFiles, tsconfigPath);

        const sourceFiles: SourceFileEntry[] = [];
        for (const filePath of contractFiles) {
          const sourceFile = program.getSourceFile(filePath);
          if (sourceFile) {
            sourceFiles.push({
              path: filePath,
              kind: 'contract',
              sourceFile,
            });
          }
        }

        for (const filePath of testFiles) {
          const sourceFile = program.getSourceFile(filePath);
          if (sourceFile) {
            sourceFiles.push({
              path: filePath,
              kind: 'test',
              sourceFile,
            });
          }
        }

        if (sourceFiles.length === 0) {
          console.log('No source files found.');
          process.exit(0);
          return;
        }

        const filterIds = contracts.length > 0 ? new Set(contracts) : undefined;
        const initialState: DocPipelineState = {
          title: config.title,
          description: config.description,
          flowEnabled: config.flow ?? true,
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

        const result = coverageGenerate(initialState, {
          sourceFiles,
          filterIds,
        });
        if (!isOk(result)) {
          console.error(
            `Pipeline failed at step ${result.error.stepIndex}: ${result.error.contractName}`
          );
          process.exit(1);
          return;
        }

        const report = result.value.coverageReport;
        if (!report) {
          console.error('Coverage report was not generated.');
          process.exit(1);
          return;
        }

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
