import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { discoverSourceFiles } from '../src/doc/parser/source-discovery';

const temporaryRepos: string[] = [];

function createTempRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'seizu-cli-discovery-'));
  temporaryRepos.push(repoPath);
  return repoPath;
}

afterEach(() => {
  for (const repoPath of temporaryRepos.splice(0)) {
    rmSync(repoPath, { recursive: true, force: true });
  }
});

describe('discoverSourceFiles', () => {
  test('falls back to repository-wide scan and excludes heavy directories', () => {
    const repoPath = createTempRepo();
    const contractPath = join(repoPath, 'src', 'cart-contract.ts');
    const scenarioPath = join(repoPath, 'src', 'cart-scenario.ts');
    const ignoredPath = join(repoPath, 'node_modules', 'pkg', 'ignored.ts');

    mkdirSync(join(repoPath, 'src'), { recursive: true });
    mkdirSync(join(repoPath, 'node_modules', 'pkg'), { recursive: true });
    mkdirSync(join(repoPath, 'dist'), { recursive: true });

    writeFileSync(
      contractPath,
      "import { define } from 'seizu';\nexport const c = define('cart.create', {});\n",
      'utf-8'
    );
    writeFileSync(
      scenarioPath,
      "import { scenario } from 'seizu';\nexport const s = scenario('cart.flow', () => []);\n",
      'utf-8'
    );
    writeFileSync(
      ignoredPath,
      "import { define } from 'seizu';\nexport const ignored = define('ignored', {});\n",
      'utf-8'
    );
    writeFileSync(
      join(repoPath, 'dist', 'ignored.ts'),
      "import { scenario } from 'seizu';\nexport const ignored = scenario('ignored', () => []);\n",
      'utf-8'
    );

    const result = discoverSourceFiles({ basePath: repoPath });

    expect(result.contractFiles).toContain(contractPath);
    expect(result.scenarioFiles).toContain(scenarioPath);
    expect(result.files.some((file) => file.path === ignoredPath)).toBe(false);
    expect(
      result.files.some((file) =>
        ['node_modules', 'dist'].some((segment) => file.path.includes(segment))
      )
    ).toBe(false);
  });

  test('classifies files with define() and scenario()', () => {
    const repoPath = createTempRepo();
    const sourcePath = join(repoPath, 'src', 'entry.ts');

    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(
      sourcePath,
      [
        "import { define, scenario } from 'seizu';",
        "export const contract = define('cart.create', {});",
        "export const flow = scenario('cart.flow', () => []);",
        '',
      ].join('\n'),
      'utf-8'
    );

    const result = discoverSourceFiles({
      basePath: repoPath,
      entrypoints: ['src/entry.ts'],
    });

    expect(result.contractFiles).toEqual([sourcePath]);
    expect(result.scenarioFiles).toEqual([sourcePath]);
    expect(result.files).toEqual([
      {
        path: sourcePath,
        hasDefine: true,
        hasScenario: true,
      },
    ]);
  });

  test('classifies mixed define+scenario usage with import aliases', () => {
    const repoPath = createTempRepo();
    const sourcePath = join(repoPath, 'src', 'aliased.ts');

    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(
      sourcePath,
      [
        "import { define as createContract, scenario as createScenario } from 'seizu';",
        "export const contract = createContract('cart.create', {});",
        "export const flow = createScenario('cart.flow', () => []);",
        '',
      ].join('\n'),
      'utf-8'
    );

    const result = discoverSourceFiles({ basePath: repoPath });

    expect(result.contractFiles).toEqual([sourcePath]);
    expect(result.scenarioFiles).toEqual([sourcePath]);
    expect(result.files).toEqual([
      {
        path: sourcePath,
        hasDefine: true,
        hasScenario: true,
      },
    ]);
  });

  test('classifies define/scenario usage from namespace imports', () => {
    const repoPath = createTempRepo();
    const sourcePath = join(repoPath, 'src', 'namespace.ts');

    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(
      sourcePath,
      [
        "import * as kata from 'seizu';",
        "export const contract = kata.define('cart.create', {});",
        "export const flow = kata.scenario('cart.flow', () => []);",
        '',
      ].join('\n'),
      'utf-8'
    );

    const result = discoverSourceFiles({ basePath: repoPath });

    expect(result.contractFiles).toEqual([sourcePath]);
    expect(result.scenarioFiles).toEqual([sourcePath]);
    expect(result.files).toEqual([
      {
        path: sourcePath,
        hasDefine: true,
        hasScenario: true,
      },
    ]);
  });

  test('uses entrypoint directories as discovery seeds', () => {
    const repoPath = createTempRepo();
    const seededContract = join(repoPath, 'apps', 'checkout', 'contract.ts');
    const outsideContract = join(repoPath, 'apps', 'inventory', 'contract.ts');

    mkdirSync(join(repoPath, 'apps', 'checkout'), { recursive: true });
    mkdirSync(join(repoPath, 'apps', 'inventory'), { recursive: true });

    writeFileSync(
      seededContract,
      "import { define } from 'seizu';\nexport const c = define('checkout.create', {});\n",
      'utf-8'
    );
    writeFileSync(
      outsideContract,
      "import { define } from 'seizu';\nexport const c = define('inventory.create', {});\n",
      'utf-8'
    );

    const result = discoverSourceFiles({
      basePath: repoPath,
      entrypoints: ['apps/checkout'],
    });

    expect(result.contractFiles).toEqual([seededContract]);
    expect(result.contractFiles).not.toContain(outsideContract);
  });
});
