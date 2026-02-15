import type { Result } from './result';
import { err, ok } from './result';
import type { Contract } from './types';

export interface ScenarioFailure {
  readonly stepIndex: number;
  readonly contractName: string;
  readonly error: unknown;
}

export interface StepDef<TState, TInput, TError> {
  readonly contract: Contract<TState, TInput, TError>;
  readonly input: TInput;
}

export function step<TState, TInput, TError>(
  contract: Contract<TState, TInput, TError>,
  input: TInput
): StepDef<TState, TInput, TError> {
  return {
    contract,
    input,
  };
}

type AnyStep<TState> = StepDef<TState, unknown, unknown>;

export interface ScenarioDef<TState, TInput> {
  readonly name: string;
  readonly flow: (input: TInput) => ReadonlyArray<AnyStep<TState>>;
}

export type Scenario<TState, TInput> = ((
  state: TState,
  input: TInput
) => Result<TState, ScenarioFailure>) &
  ScenarioDef<TState, TInput>;

export function scenario<TState, TInput>(
  name: string,
  body: Omit<ScenarioDef<TState, TInput>, 'name'>
): Scenario<TState, TInput> {
  const def = { name, ...body };
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
          contractName: s.contract.name,
          error: result.error,
        });
      }
      currentState = result.value;
    }

    return ok(currentState);
  };

  Object.defineProperty(execute, 'name', {
    value: name,
    configurable: true,
  });
  return Object.assign(execute, body) as Scenario<TState, TInput>;
}
