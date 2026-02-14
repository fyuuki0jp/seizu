import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

export function createProgramFromFiles(
  filePaths: readonly string[],
  tsconfigPath?: string
): ts.Program {
  const compilerOptions = tsconfigPath
    ? loadCompilerOptions(tsconfigPath)
    : {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        noEmit: true,
      };

  return ts.createProgram([...filePaths], compilerOptions);
}

function loadCompilerOptions(tsconfigPath: string): ts.CompilerOptions {
  const absolutePath = resolve(process.cwd(), tsconfigPath);
  const configFile = ts.readConfigFile(absolutePath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${absolutePath}`);
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    resolve(absolutePath, '..')
  );
  return parsed.options;
}

export function resolveGlobs(
  patterns: readonly string[],
  basePath: string
): string[] {
  const files: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      files.push(...expandGlob(pattern, basePath));
    } else {
      const abs = resolve(basePath, pattern);
      files.push(abs);
    }
  }
  return [...new Set(files)];
}

function expandGlob(pattern: string, basePath: string): string[] {
  const parts = pattern.split('/');
  const results: string[] = [];
  collectFiles(basePath, parts, 0, results);
  return results;
}

function collectFiles(
  dir: string,
  parts: readonly string[],
  index: number,
  results: string[]
): void {
  if (index >= parts.length) return;

  const part = parts[index];
  const isLast = index === parts.length - 1;

  if (part === '**') {
    // Match zero or more directories
    // Try matching the rest from this directory
    collectFiles(dir, parts, index + 1, results);

    // Recurse into subdirectories
    for (const entry of readDirSafe(dir)) {
      const fullPath = join(dir, entry);
      if (isDirectory(fullPath)) {
        collectFiles(fullPath, parts, index, results);
      }
    }
  } else if (part.includes('*')) {
    const regex = globPartToRegex(part);
    for (const entry of readDirSafe(dir)) {
      if (regex.test(entry)) {
        const fullPath = join(dir, entry);
        if (isLast) {
          if (!isDirectory(fullPath)) {
            results.push(fullPath);
          }
        } else {
          if (isDirectory(fullPath)) {
            collectFiles(fullPath, parts, index + 1, results);
          }
        }
      }
    }
  } else {
    const fullPath = join(dir, part);
    if (isLast) {
      if (!isDirectory(fullPath)) {
        results.push(fullPath);
      }
    } else {
      if (isDirectory(fullPath)) {
        collectFiles(fullPath, parts, index + 1, results);
      }
    }
  }
}

function globPartToRegex(part: string): RegExp {
  const escaped = part
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function readDirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
