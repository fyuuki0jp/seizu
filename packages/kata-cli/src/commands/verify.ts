import type { CAC } from 'cac';
import { verify } from 'kata/verify';
import { ConfigError, loadConfig } from '../verify/config';
import { json } from '../verify/reporters/json';
import { replay } from '../verify/reporters/replay';
import { summary } from '../verify/reporters/summary';

const reporters = { summary, json, replay } as const;
type ReporterName = keyof typeof reporters;

export function registerVerifyCommand(cli: CAC): void {
  cli
    .command('verify [...contracts]', 'Verify contracts with PBT')
    .option('--reporter <type>', 'Reporter: summary, json, replay', {
      default: 'summary',
    })
    .option('--runs <count>', 'Number of PBT runs', { default: 100 })
    .option('--config <path>', 'Config file path')
    .option('--seed <seed>', 'Random seed for reproduction')
    .option('--path <path>', 'Counterexample path for reproduction')
    .action(async (contracts: string[], options) => {
      try {
        const { config } = await loadConfig(options.config);

        let entries = config.contracts;
        if (contracts.length > 0) {
          entries = entries.filter((e) => contracts.includes(e.contract.id));
          if (entries.length === 0) {
            console.error(`No contracts matched: ${contracts.join(', ')}`);
            process.exit(2);
          }
        }

        const result = verify(entries, {
          numRuns: Number(options.runs),
          seed: options.seed !== undefined ? Number(options.seed) : undefined,
          path: options.path,
        });

        const reporterName = options.reporter as ReporterName;
        const reporter = reporters[reporterName] ?? reporters.summary;
        console.log(reporter(result));

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        if (error instanceof ConfigError) {
          console.error(`Configuration error: ${error.message}`);
          process.exit(2);
        }
        throw error;
      }
    });
}
