import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CAC } from 'cac';
import { ConfigError, loadConfig } from '../doc/config';
import { generate } from '../doc/index';

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

        const filterIds = contracts.length > 0 ? contracts : undefined;

        const markdown = generate(effectiveConfig, { filterIds });

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
