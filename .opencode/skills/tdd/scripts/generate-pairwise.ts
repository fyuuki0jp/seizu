#!/usr/bin/env npx tsx
/**
 * ペアワイズ法によるテストケース生成スクリプト
 *
 * Usage:
 *   npx tsx scripts/generate-pairwise.ts <config-file>
 *
 * Config file example (JSON):
 * {
 *   "parameters": {
 *     "status": ["pending", "in_progress", "completed"],
 *     "priority": [1, 5, 10]
 *   },
 *   "boundaries": {
 *     "priority": [0, -1, 11, 100]
 *   }
 * }
 *
 * Output: テストケースの組み合わせをJSONで出力
 */

interface PairwiseConfig {
  parameters: Record<string, (string | number | boolean | null)[]>;
  boundaries?: Record<string, (string | number | boolean | null)[]>;
}

interface TestCase {
  id: number;
  params: Record<string, string | number | boolean | null>;
  isBoundary: boolean;
}

/**
 * ペアワイズ組み合わせを生成
 * すべてのパラメータペアが少なくとも1回はテストされることを保証
 */
function generatePairwise(
  parameters: Record<string, (string | number | boolean | null)[]>
): Record<string, string | number | boolean | null>[] {
  const paramNames = Object.keys(parameters);
  if (paramNames.length === 0) return [];
  if (paramNames.length === 1) {
    return parameters[paramNames[0]].map((v) => ({ [paramNames[0]]: v }));
  }

  // すべてのペアを収集
  const pairs: Map<string, Set<string>> = new Map();
  for (let i = 0; i < paramNames.length; i++) {
    for (let j = i + 1; j < paramNames.length; j++) {
      const key = `${paramNames[i]}|${paramNames[j]}`;
      const pairSet = new Set<string>();
      for (const v1 of parameters[paramNames[i]]) {
        for (const v2 of parameters[paramNames[j]]) {
          pairSet.add(`${JSON.stringify(v1)}|${JSON.stringify(v2)}`);
        }
      }
      pairs.set(key, pairSet);
    }
  }

  const testCases: Record<string, string | number | boolean | null>[] = [];
  const uncoveredPairs = new Map(pairs);

  // 貪欲法でペアをカバー
  while (hasUncoveredPairs(uncoveredPairs)) {
    let bestCase: Record<string, string | number | boolean | null> | null =
      null;
    let bestCoverage = 0;

    // 各パラメータの値の組み合わせを試す
    const combinations = generateAllCombinations(parameters);
    for (const combo of combinations) {
      const coverage = countNewCoverage(combo, uncoveredPairs, paramNames);
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestCase = combo;
      }
    }

    if (bestCase) {
      testCases.push(bestCase);
      markCovered(bestCase, uncoveredPairs, paramNames);
    } else {
      break;
    }
  }

  return testCases;
}

function hasUncoveredPairs(pairs: Map<string, Set<string>>): boolean {
  for (const [, set] of pairs) {
    if (set.size > 0) return true;
  }
  return false;
}

function generateAllCombinations(
  parameters: Record<string, (string | number | boolean | null)[]>
): Record<string, string | number | boolean | null>[] {
  const paramNames = Object.keys(parameters);
  const results: Record<string, string | number | boolean | null>[] = [];

  function recurse(
    index: number,
    current: Record<string, string | number | boolean | null>
  ) {
    if (index === paramNames.length) {
      results.push({ ...current });
      return;
    }
    const paramName = paramNames[index];
    for (const value of parameters[paramName]) {
      current[paramName] = value;
      recurse(index + 1, current);
    }
  }

  recurse(0, {});
  return results;
}

function countNewCoverage(
  testCase: Record<string, string | number | boolean | null>,
  uncoveredPairs: Map<string, Set<string>>,
  paramNames: string[]
): number {
  let count = 0;
  for (let i = 0; i < paramNames.length; i++) {
    for (let j = i + 1; j < paramNames.length; j++) {
      const key = `${paramNames[i]}|${paramNames[j]}`;
      const pairValue = `${JSON.stringify(testCase[paramNames[i]])}|${JSON.stringify(testCase[paramNames[j]])}`;
      const set = uncoveredPairs.get(key);
      if (set?.has(pairValue)) {
        count++;
      }
    }
  }
  return count;
}

function markCovered(
  testCase: Record<string, string | number | boolean | null>,
  uncoveredPairs: Map<string, Set<string>>,
  paramNames: string[]
) {
  for (let i = 0; i < paramNames.length; i++) {
    for (let j = i + 1; j < paramNames.length; j++) {
      const key = `${paramNames[i]}|${paramNames[j]}`;
      const pairValue = `${JSON.stringify(testCase[paramNames[i]])}|${JSON.stringify(testCase[paramNames[j]])}`;
      uncoveredPairs.get(key)?.delete(pairValue);
    }
  }
}

/**
 * 境界値テストケースを生成
 */
function generateBoundaryTests(
  parameters: Record<string, (string | number | boolean | null)[]>,
  boundaries: Record<string, (string | number | boolean | null)[]>
): Record<string, string | number | boolean | null>[] {
  const testCases: Record<string, string | number | boolean | null>[] = [];
  const paramNames = Object.keys(parameters);

  for (const [boundaryParam, boundaryValues] of Object.entries(boundaries)) {
    for (const boundaryValue of boundaryValues) {
      // 境界値以外のパラメータは代表値（最初の値）を使用
      const testCase: Record<string, string | number | boolean | null> = {};
      for (const param of paramNames) {
        if (param === boundaryParam) {
          testCase[param] = boundaryValue;
        } else {
          testCase[param] = parameters[param][0];
        }
      }
      testCases.push(testCase);
    }
  }

  return testCases;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // インタラクティブモード: 標準入力からJSONを読む
    console.error('Usage: npx tsx scripts/generate-pairwise.ts <config.json>');
    console.error('');
    console.error('Config format:');
    console.error(
      JSON.stringify(
        {
          parameters: {
            status: ['pending', 'in_progress', 'completed'],
            priority: [1, 5, 10],
          },
          boundaries: {
            priority: [0, -1, 11],
          },
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const configPath = args[0];
  const fs = await import('node:fs');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: PairwiseConfig = JSON.parse(configContent);

  // ペアワイズテストケース生成
  const pairwiseCases = generatePairwise(config.parameters);

  // 境界値テストケース生成
  const boundaryCases = config.boundaries
    ? generateBoundaryTests(config.parameters, config.boundaries)
    : [];

  // 結果を統合
  const allCases: TestCase[] = [
    ...pairwiseCases.map((params, i) => ({
      id: i + 1,
      params,
      isBoundary: false,
    })),
    ...boundaryCases.map((params, i) => ({
      id: pairwiseCases.length + i + 1,
      params,
      isBoundary: true,
    })),
  ];

  // 統計情報
  const stats = {
    totalParameters: Object.keys(config.parameters).length,
    totalValues: Object.values(config.parameters).reduce(
      (sum, v) => sum + v.length,
      0
    ),
    pairwiseCases: pairwiseCases.length,
    boundaryCases: boundaryCases.length,
    totalCases: allCases.length,
    fullCombinations: Object.values(config.parameters).reduce(
      (prod, v) => prod * v.length,
      1
    ),
    reduction: `${((1 - allCases.length / Object.values(config.parameters).reduce((prod, v) => prod * v.length, 1)) * 100).toFixed(1)}%`,
  };

  console.log(JSON.stringify({ stats, testCases: allCases }, null, 2));
}

main().catch(console.error);
