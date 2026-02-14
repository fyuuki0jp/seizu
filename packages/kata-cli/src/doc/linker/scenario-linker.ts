import type { LinkedScenario, ParsedContract, ParsedScenario } from '../types';

export function linkScenarios(
  scenarios: readonly ParsedScenario[],
  contracts: readonly ParsedContract[]
): LinkedScenario[] {
  const contractById = new Map<string, ParsedContract>();
  const contractByVar = new Map<string, ParsedContract>();

  for (const c of contracts) {
    contractById.set(c.id, c);
    if (c.variableName) {
      contractByVar.set(c.variableName, c);
    }
  }

  return scenarios.map((scenario) => ({
    scenario,
    resolvedSteps: scenario.steps.map((step) => ({
      step,
      contract:
        contractById.get(step.contractId) ?? contractByVar.get(step.contractId),
    })),
  }));
}
