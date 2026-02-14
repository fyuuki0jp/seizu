import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CAC } from 'cac';
import { isOk } from 'kata';
import { ConfigError, loadConfig } from '../config';
import type { FlowArtifact } from '../doc/flow';
import { getMessages } from '../doc/i18n/index';
import type { Locale } from '../doc/i18n/types';
import {
  createProgramFromFiles,
  resolveGlobs,
} from '../doc/parser/source-resolver';
import { renderMarkdown } from '../doc/renderer/markdown';
import { docGenerate } from '../domain/pipeline';
import type { DocPipelineState, SourceFileEntry } from '../domain/types';

export function registerDocCommand(cli: CAC): void {
  cli
    .command('doc [...contracts]', 'Generate contract documentation')
    .option('--config <path>', 'Config file path', {
      default: 'kata.config.ts',
    })
    .option('--output <path>', 'Output file path (overrides config)')
    .option('--title <title>', 'Document title (overrides config)')
    .option('--locale <locale>', 'Locale: en or ja')
    .option('--coverage', 'Include coverage summary', { default: false })
    .option('--flow', 'Include flow visualization')
    .option('--no-flow', 'Disable flow visualization')
    .option('--check', 'Check output matches regenerated markdown')
    .option(
      '--flow-debug-output <path>',
      'Write normalized flow artifacts JSON (debug only)'
    )
    .option('--stdout', 'Write to stdout instead of file', { default: false })
    .action(async (contracts: string[], options) => {
      try {
        const { config } = await loadConfig(options.config);
        const locale = (options.locale ?? config.locale ?? 'en') as Locale;

        const flowEnabled =
          typeof options.flow === 'boolean'
            ? options.flow
            : (config.flow ?? true);

        const effectiveConfig = {
          ...config,
          ...(options.output ? { output: options.output } : {}),
          ...(options.title ? { title: options.title } : {}),
          ...(options.coverage ? { coverage: true } : {}),
          locale,
          flow: flowEnabled,
          ...(options.flowDebugOutput
            ? { flowDebugOutput: options.flowDebugOutput }
            : {}),
        };

        const basePath = process.cwd();
        const messages = getMessages(locale);
        const contractFiles = resolveGlobs(effectiveConfig.contracts, basePath);
        const scenarioFiles = effectiveConfig.scenarios
          ? resolveGlobs(effectiveConfig.scenarios, basePath)
          : [];
        const testFiles = effectiveConfig.tests
          ? resolveGlobs(effectiveConfig.tests, basePath)
          : [];

        const allFiles = [...contractFiles, ...scenarioFiles, ...testFiles];

        const tsconfigPath = effectiveConfig.tsconfig
          ? resolve(basePath, effectiveConfig.tsconfig)
          : undefined;
        const program =
          allFiles.length > 0
            ? createProgramFromFiles(allFiles, tsconfigPath)
            : undefined;

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

        const filterIds = contracts.length > 0 ? new Set(contracts) : undefined;

        const initialState: DocPipelineState = {
          title: effectiveConfig.title,
          description: effectiveConfig.description,
          flowEnabled: effectiveConfig.flow ?? true,
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
        let flowArtifacts: FlowArtifact[] = [];

        if (sourceFiles.length === 0) {
          markdown = renderMarkdown(
            {
              title: effectiveConfig.title,
              description: effectiveConfig.description,
              contracts: [],
              scenarios: [],
              sourceFiles: [],
            },
            { messages, flowEnabled: effectiveConfig.flow ?? true }
          );
        } else {
          const result = docGenerate(initialState, {
            sourceFiles,
            filterIds,
            coverageEnabled: effectiveConfig.coverage ?? false,
          });

          if (isOk(result)) {
            markdown = result.value.markdown;
            flowArtifacts = collectFlowArtifacts(result.value);
          } else {
            console.error(
              `Pipeline failed at step ${result.error.stepIndex}: ${result.error.contractId}`
            );
            process.exit(1);
            return;
          }
        }

        if (effectiveConfig.flowDebugOutput) {
          const outputPath = resolve(
            process.cwd(),
            effectiveConfig.flowDebugOutput
          );
          mkdirSync(dirname(outputPath), { recursive: true });
          writeFileSync(
            outputPath,
            serializeFlowArtifacts(flowArtifacts),
            'utf-8'
          );
          console.log(`Flow debug JSON written to ${outputPath}`);
        }

        const outputPath = resolve(
          process.cwd(),
          effectiveConfig.output ?? 'docs/contracts.md'
        );

        if (options.check) {
          if (!existsSync(outputPath)) {
            console.error(`Documentation file not found: ${outputPath}`);
            process.exit(1);
            return;
          }

          const existing = readFileSync(outputPath, 'utf-8');
          if (existing !== markdown) {
            console.error(
              `Documentation is out of date: ${outputPath}\nRun: kata doc --config ${options.config}`
            );
            process.exit(1);
            return;
          }

          console.log(`Documentation is up to date: ${outputPath}`);
          process.exit(0);
          return;
        }

        if (options.stdout) {
          process.stdout.write(markdown);
        } else {
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

function collectFlowArtifacts(state: DocPipelineState): FlowArtifact[] {
  const artifacts: FlowArtifact[] = [];

  for (const linked of state.linked) {
    if (linked.contract.flow) {
      artifacts.push(linked.contract.flow);
    }
  }

  for (const linked of state.linkedScenarios) {
    if (linked.scenario.flow) {
      artifacts.push(linked.scenario.flow);
    }
  }

  return artifacts.sort((a, b) => {
    const ownerCmp = a.ownerKind.localeCompare(b.ownerKind);
    if (ownerCmp !== 0) return ownerCmp;
    return a.ownerId.localeCompare(b.ownerId);
  });
}

function serializeFlowArtifacts(artifacts: readonly FlowArtifact[]): string {
  return `${JSON.stringify(artifacts, null, 2)}\n`;
}
