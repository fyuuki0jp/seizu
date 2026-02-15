import type { LinkedScenario, ParsedContract, ParsedScenario } from '../types';

export function linkScenarios(
  scenarios: readonly ParsedScenario[],
  contracts: readonly ParsedContract[]
): LinkedScenario[] {
  const contractByName = new Map<string, ParsedContract>();
  const contractByVar = new Map<string, ParsedContract>();

  for (const c of contracts) {
    contractByName.set(c.name, c);
    if (c.variableName) {
      contractByVar.set(c.variableName, c);
    }
  }

  return scenarios.map((scenario) => ({
    scenario,
    resolvedSteps: scenario.steps.map((step) => ({
      step,
      contract:
        contractByName.get(step.contractName) ??
        contractByVar.get(step.contractName),
    })),
  }));
}
