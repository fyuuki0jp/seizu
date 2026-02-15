import type { Result } from './result';
import { err, ok } from './result';
import type { Contract } from './types';

// === Step: scenario 合成用の部分適用演算子 ===
// contract の input をバインドし、state だけ受け取る関数を返す。
// TInput はクロージャに捕捉、TError は型に保持。
export type Step<TState, TError> = ((
  state: TState
) => Result<TState, TError>) & {
  readonly contractName: string;
};

export function step<TState, TInput, TError>(
  contract: Contract<TState, TInput, TError>,
  input: TInput
): Step<TState, TError> {
  const fn = (state: TState) => contract(state, input);
  return Object.assign(fn, { contractName: contract.name }) as Step<
    TState,
    TError
  >;
}

// === Scenario 型定義 ===
export interface ScenarioFailure<TError = unknown> {
  readonly stepIndex: number;
  readonly contractName: string;
  readonly error: TError;
}

export type Scenario<TState, TInput, TError> = ((
  state: TState,
  input: TInput
) => Result<TState, ScenarioFailure<TError>>) & {
  readonly name: string;
  readonly flow: (input: TInput) => ReadonlyArray<Step<TState, TError>>;
};

export function scenario<TState, TInput, TError>(
  name: string,
  flow: (input: TInput) => ReadonlyArray<Step<TState, TError>>
): Scenario<TState, TInput, TError> {
  const execute = (
    state: TState,
    input: TInput
  ): Result<TState, ScenarioFailure<TError>> => {
    const steps = flow(input);
    let currentState = state;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const result = s(currentState);
      if (!result.ok) {
        return err({
          stepIndex: i,
          contractName: s.contractName,
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
  return Object.assign(execute, { flow }) as Scenario<TState, TInput, TError>;
}
