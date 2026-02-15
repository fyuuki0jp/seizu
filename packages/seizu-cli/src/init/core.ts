import { lstatSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderSeizuConfig } from './templates/seizu-config.ts';
import { renderSkillMd } from './templates/skill.md';
import type {
  FileStatus,
  GeneratedFile,
  InitOptions,
  InitResult,
} from './types';

interface FileEntry {
  readonly relativePath: string;
  readonly render: () => string;
}

const FILES: readonly FileEntry[] = [
  { relativePath: '.claude/skills/seizu/SKILL.md', render: renderSkillMd },
  { relativePath: 'seizu.config.ts', render: renderSeizuConfig },
];

interface FileState {
  readonly status: FileStatus;
  readonly isSymlink: boolean;
}

function resolveFileState(absolutePath: string, force: boolean): FileState {
  try {
    const stat = lstatSync(absolutePath);
    return {
      status: force ? 'overwritten' : 'skipped',
      isSymlink: stat.isSymbolicLink(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { status: 'created', isSymlink: false };
  }
}

/**
 * Generate init scaffold files.
 *
 * - Existing files are skipped unless `force` is true.
 * - When `dryRun` is true, nothing is written to disk.
 */
export function initScaffold(
  basePath: string,
  options: InitOptions = {}
): InitResult {
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;

  const files: GeneratedFile[] = FILES.map((entry) => {
    const absolutePath = resolve(basePath, entry.relativePath);
    const { status, isSymlink } = resolveFileState(absolutePath, force);
    const content = entry.render();

    if (!dryRun && status !== 'skipped') {
      mkdirSync(dirname(absolutePath), { recursive: true });
      if (isSymlink) unlinkSync(absolutePath);
      writeFileSync(absolutePath, content, 'utf-8');
    }

    return { path: entry.relativePath, status, content };
  });

  return { files };
}
