import type { Result } from './result';
import { err, ok } from './result';
import type { Contract } from './types';

export interface ScenarioFailure {
  readonly stepIndex: number;
  readonly contractId: string;
  readonly error: unknown;
}

export interface StepDef<TState> {
  readonly contract: Contract<TState, unknown, unknown>;
  readonly input: unknown;
}

export function step<TState, TInput, TError>(
  contract: Contract<TState, TInput, TError>,
  input: TInput
): StepDef<TState> {
  return {
    contract: contract as unknown as Contract<TState, unknown, unknown>,
    input,
  };
}

export interface ScenarioDef<TState, TInput> {
  readonly id: string;
  readonly description?: string;
  readonly flow: (input: TInput) => ReadonlyArray<StepDef<TState>>;
}

export type Scenario<TState, TInput> = ((
  state: TState,
  input: TInput
) => Result<TState, ScenarioFailure>) &
  ScenarioDef<TState, TInput>;

export function scenario<TState, TInput>(
  def: ScenarioDef<TState, TInput>
): Scenario<TState, TInput> {
  const execute = (
    state: TState,
    input: TInput
  ): Result<TState, ScenarioFailure> => {
    const steps = def.flow(input);
    let currentState = state;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const result = s.contract(currentState, s.input);
      if (!result.ok) {
        return err({
          stepIndex: i,
          contractId: s.contract.id,
          error: result.error,
        });
      }
      currentState = result.value;
    }

    return ok(currentState);
  };

  return Object.assign(execute, def);
}
