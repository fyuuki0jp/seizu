import type { Result } from './result';

export type ConditionResult = true | string;

export type Guard<TState, TInput, TError> = {
  readonly label: string;
  readonly fn: (state: TState, input: TInput) => Result<void, TError>;
};

export type Condition<TState, TInput> = {
  readonly label: string;
  readonly fn: (
    before: TState,
    after: TState,
    input: TInput
  ) => ConditionResult;
};

export type Invariant<TState> = {
  readonly label: string;
  readonly fn: (state: TState) => ConditionResult;
};

export function guard<TState, TInput, TError>(
  label: string,
  fn: (state: TState, input: TInput) => Result<void, TError>
): Guard<TState, TInput, TError> {
  return { label, fn };
}

export function check<TState, TInput>(
  label: string,
  fn: (before: TState, after: TState, input: TInput) => ConditionResult
): Condition<TState, TInput> {
  return { label, fn };
}

export function ensure<TState>(
  label: string,
  fn: (state: TState) => ConditionResult
): Invariant<TState> {
  return { label, fn };
}

export interface ContractDef<TState, TInput, TError> {
  readonly name: string;
  readonly pre: ReadonlyArray<Guard<TState, TInput, TError>>;
  readonly transition: (state: TState, input: TInput) => TState;
  readonly post?: ReadonlyArray<Condition<TState, TInput>>;
  readonly invariant?: ReadonlyArray<Invariant<TState>>;
}

export type Contract<TState, TInput, TError> = ((
  state: TState,
  input: TInput
) => Result<TState, TError>) &
  ContractDef<TState, TInput, TError>;

export type ContractMode = 'production' | 'strict';

export interface ContractOptions {
  readonly mode?: ContractMode;
}
