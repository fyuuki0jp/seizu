import { lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CAC } from 'cac';
import { initScaffold } from '../init';
import { generateRequirements } from '../init/requirements';
import type { FileStatus, GeneratedFile } from '../init/types';

const STATUS_ICON: Record<string, string> = {
  created: '✓',
  skipped: '⊘',
  overwritten: '⤻',
};

function printResults(files: readonly GeneratedFile[], dryRun: boolean): void {
  const prefix = dryRun ? '[dry-run] ' : '';
  for (const file of files) {
    const icon = STATUS_ICON[file.status] ?? '?';
    console.log(`${prefix}${icon} ${file.path} (${file.status})`);
  }
}

export function registerInitCommand(cli: CAC): void {
  cli
    .command('init', 'Initialize seizu project scaffolding')
    .option('--claude', 'Generate Claude Code skill files')
    .option('--force', 'Overwrite existing files', { default: false })
    .option('--dry-run', 'Preview changes without writing', { default: false })
    .option('--with-requirements', 'Generate requirements.md template', {
      default: false,
    })
    .action((options) => {
      if (!options.claude) {
        console.error(
          'Platform flag required. Use --claude to generate Claude Code scaffolding.'
        );
        process.exit(2);
        return;
      }

      const basePath = process.cwd();
      const force = options.force as boolean;
      const dryRun = options.dryRun as boolean;

      const allFiles = [...initScaffold(basePath, { force, dryRun }).files];

      if (options.withRequirements) {
        const reqPath = 'requirements.md';
        const absPath = resolve(basePath, reqPath);
        const content = generateRequirements([
          { id: 'REQ-001', description: '', accepts: [] },
        ]);

        let status: FileStatus = 'created';
        try {
          lstatSync(absPath);
          status = force ? 'overwritten' : 'skipped';
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }

        if (!dryRun && status !== 'skipped') {
          mkdirSync(dirname(absPath), { recursive: true });
          writeFileSync(absPath, content, 'utf-8');
        }

        allFiles.push({ path: reqPath, status, content });
      }

      printResults(allFiles, dryRun);
      process.exit(0);
    });
}
