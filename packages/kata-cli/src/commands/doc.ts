import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CAC } from 'cac';
import { isOk } from 'kata';
import { ConfigError, loadConfig } from '../doc/config';
import { getMessages } from '../doc/i18n/index';
import {
  createProgramFromFiles,
  resolveGlobs,
} from '../doc/parser/source-resolver';
import { docGenerate } from '../domain/pipeline';
import type { DocPipelineState, SourceFileEntry } from '../domain/types';

export function registerDocCommand(cli: CAC): void {
  cli
    .command('doc [...contracts]', 'Generate contract documentation')
    .option('--config <path>', 'Config file path', {
      default: 'kata-doc.config.ts',
    })
    .option('--output <path>', 'Output file path (overrides config)')
    .option('--title <title>', 'Document title (overrides config)')
    .option('--locale <locale>', 'Locale: en or ja', { default: 'en' })
    .option('--coverage', 'Include coverage summary', { default: false })
    .option('--stdout', 'Write to stdout instead of file', { default: false })
    .action(async (contracts: string[], options) => {
      try {
        const { config } = await loadConfig(options.config);

        const effectiveConfig = {
          ...config,
          ...(options.output ? { output: options.output } : {}),
          ...(options.title ? { title: options.title } : {}),
          ...(options.locale ? { locale: options.locale } : {}),
          ...(options.coverage ? { coverage: true } : {}),
        };

        // IO: resolve files
        const basePath = process.cwd();
        const messages = getMessages(effectiveConfig.locale ?? 'en');
        const contractFiles = resolveGlobs(effectiveConfig.contracts, basePath);
        const scenarioFiles = effectiveConfig.scenarios
          ? resolveGlobs(effectiveConfig.scenarios, basePath)
          : [];
        const testFiles = effectiveConfig.tests
          ? resolveGlobs(effectiveConfig.tests, basePath)
          : [];

        const allFiles = [...contractFiles, ...scenarioFiles, ...testFiles];

        // IO: create TypeScript program
        const tsconfigPath = effectiveConfig.tsconfig
          ? resolve(basePath, effectiveConfig.tsconfig)
          : undefined;
        const program =
          allFiles.length > 0
            ? createProgramFromFiles(allFiles, tsconfigPath)
            : undefined;

        // Prepare source file entries (IO → Pure bridge)
        const sourceFiles: SourceFileEntry[] = [];
        if (program) {
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
        }

        // Pure: run kata pipeline
        const filterIds = contracts.length > 0 ? new Set(contracts) : undefined;

        const initialState: DocPipelineState = {
          title: effectiveConfig.title,
          description: effectiveConfig.description,
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

        let markdown: string;

        if (sourceFiles.length === 0) {
          // No source files: render empty document
          const { renderMarkdown } = await import('../doc/renderer/markdown');
          markdown = renderMarkdown(
            {
              title: effectiveConfig.title,
              description: effectiveConfig.description,
              contracts: [],
              scenarios: [],
              sourceFiles: [],
            },
            { messages }
          );
        } else {
          const result = docGenerate(initialState, {
            sourceFiles,
            filterIds,
            coverageEnabled: effectiveConfig.coverage ?? false,
          });

          if (isOk(result)) {
            markdown = result.value.markdown;
          } else {
            console.error(
              `Pipeline failed at step ${result.error.stepIndex}: ${result.error.contractId}`
            );
            process.exit(1);
            return;
          }
        }

        // IO: write output
        if (options.stdout) {
          process.stdout.write(markdown);
        } else {
          const outputPath = resolve(
            process.cwd(),
            effectiveConfig.output ?? 'docs/contracts.md'
          );
          mkdirSync(dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, markdown, 'utf-8');
          console.log(`Documentation written to ${outputPath}`);
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
