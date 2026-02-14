import type { Result } from './result';

export type Guard<TState, TInput, TError> = (
  state: TState,
  input: TInput
) => Result<void, TError>;

export type Condition<TState, TInput> = (
  before: TState,
  after: TState,
  input: TInput
) => boolean;

export type Invariant<TState> = (state: TState) => boolean;

export interface ContractDef<TState, TInput, TError> {
  readonly id: string;
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
