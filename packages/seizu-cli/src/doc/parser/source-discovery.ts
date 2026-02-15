import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import ts from 'typescript';
import type {
  DiscoveredSourceFile,
  SourceDiscoveryOptions,
  SourceDiscoveryResult,
} from '../types';
import { resolveGlobs } from './source-resolver';

const DEFAULT_EXCLUDED_DIRECTORIES = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
];
const TYPE_SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const KATA_MODULE_NAME = 'seizu';

export function discoverSourceFiles(
  options: SourceDiscoveryOptions
): SourceDiscoveryResult {
  const excludedDirectories = new Set(
    options.excludeDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES
  );
  const seedPaths = resolveSeedPaths(options.basePath, options.entrypoints);
  const candidatePaths = new Set<string>();

  if (seedPaths.length === 0) {
    collectTypeScriptFiles(
      options.basePath,
      excludedDirectories,
      candidatePaths
    );
  } else {
    for (const seedPath of seedPaths) {
      if (isDirectory(seedPath)) {
        collectTypeScriptFiles(seedPath, excludedDirectories, candidatePaths);
        continue;
      }
      if (isTypeScriptSourceFile(seedPath)) {
        candidatePaths.add(seedPath);
      }
    }
  }

  const discoveredFiles: DiscoveredSourceFile[] = [];
  for (const filePath of [...candidatePaths].sort()) {
    const fileInfo = classifySourceFile(filePath);
    if (!fileInfo.hasDefine && !fileInfo.hasScenario) {
      continue;
    }
    discoveredFiles.push(fileInfo);
  }

  return {
    files: discoveredFiles,
    contractFiles: discoveredFiles
      .filter((file) => file.hasDefine)
      .map((file) => file.path),
    scenarioFiles: discoveredFiles
      .filter((file) => file.hasScenario)
      .map((file) => file.path),
  };
}

function resolveSeedPaths(
  basePath: string,
  entrypoints: readonly string[] | undefined
): string[] {
  if (!entrypoints || entrypoints.length === 0) {
    return [];
  }

  const paths = new Set<string>();
  for (const entrypoint of entrypoints) {
    if (entrypoint.includes('*')) {
      for (const filePath of resolveGlobs([entrypoint], basePath)) {
        paths.add(filePath);
      }
      continue;
    }
    paths.add(resolve(basePath, entrypoint));
  }
  return [...paths];
}

function collectTypeScriptFiles(
  directoryPath: string,
  excludedDirectories: ReadonlySet<string>,
  candidatePaths: Set<string>
): void {
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) {
        continue;
      }
      collectTypeScriptFiles(entryPath, excludedDirectories, candidatePaths);
      continue;
    }

    if (entry.isFile() && isTypeScriptSourceFile(entryPath)) {
      candidatePaths.add(entryPath);
    }
  }
}

function classifySourceFile(filePath: string): DiscoveredSourceFile {
  let sourceText = '';
  try {
    sourceText = readFileSync(filePath, 'utf-8');
  } catch {
    // ignore unreadable files
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const aliases = collectKataApiAliases(sourceFile);

  if (
    aliases.defineAliases.size === 0 &&
    aliases.scenarioAliases.size === 0 &&
    aliases.namespaceAliases.size === 0
  ) {
    return {
      path: filePath,
      hasDefine: false,
      hasScenario: false,
    };
  }

  const usage = collectKataApiUsage(sourceFile, aliases);
  return {
    path: filePath,
    hasDefine: usage.hasDefine,
    hasScenario: usage.hasScenario,
  };
}

function isTypeScriptSourceFile(filePath: string): boolean {
  const extension = extname(filePath);
  return TYPE_SCRIPT_EXTENSIONS.has(extension) && !filePath.endsWith('.d.ts');
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

interface KataApiAliases {
  readonly defineAliases: ReadonlySet<string>;
  readonly scenarioAliases: ReadonlySet<string>;
  readonly namespaceAliases: ReadonlySet<string>;
}

function collectKataApiAliases(sourceFile: ts.SourceFile): KataApiAliases {
  const defineAliases = new Set<string>();
  const scenarioAliases = new Set<string>();
  const namespaceAliases = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }
    if (
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== KATA_MODULE_NAME
    ) {
      continue;
    }

    const importClause = statement.importClause;
    if (
      !importClause ||
      importClause.isTypeOnly ||
      !importClause.namedBindings
    ) {
      continue;
    }

    if (ts.isNamespaceImport(importClause.namedBindings)) {
      namespaceAliases.add(importClause.namedBindings.name.text);
      continue;
    }

    for (const specifier of importClause.namedBindings.elements) {
      if (specifier.isTypeOnly) {
        continue;
      }
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      if (importedName === 'define') {
        defineAliases.add(specifier.name.text);
      } else if (importedName === 'scenario') {
        scenarioAliases.add(specifier.name.text);
      }
    }
  }

  return {
    defineAliases,
    scenarioAliases,
    namespaceAliases,
  };
}

function collectKataApiUsage(
  sourceFile: ts.SourceFile,
  aliases: KataApiAliases
): { hasDefine: boolean; hasScenario: boolean } {
  let hasDefine = false;
  let hasScenario = false;

  function visit(node: ts.Node): void {
    if (hasDefine && hasScenario) {
      return;
    }

    if (ts.isCallExpression(node)) {
      const apiName = resolveCalledKataApi(node.expression, aliases);
      if (apiName === 'define') {
        hasDefine = true;
      } else if (apiName === 'scenario') {
        hasScenario = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { hasDefine, hasScenario };
}

function resolveCalledKataApi(
  expression: ts.LeftHandSideExpression,
  aliases: KataApiAliases
): 'define' | 'scenario' | undefined {
  if (ts.isIdentifier(expression)) {
    if (aliases.defineAliases.has(expression.text)) {
      return 'define';
    }
    if (aliases.scenarioAliases.has(expression.text)) {
      return 'scenario';
    }
    return undefined;
  }

  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    aliases.namespaceAliases.has(expression.expression.text)
  ) {
    if (expression.name.text === 'define') {
      return 'define';
    }
    if (expression.name.text === 'scenario') {
      return 'scenario';
    }
  }

  return undefined;
}
