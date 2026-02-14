import type { Contract } from './types';

export interface StepDef<TState> {
  readonly contract: Contract<TState, unknown, unknown>;
  readonly input: unknown;
  readonly expect?: 'ok' | { error: string };
}

export function step<TState, TInput, TError>(
  contract: Contract<TState, TInput, TError>,
  input: TInput,
  options?: { expect?: 'ok' | { error: string } }
): StepDef<TState> {
  return {
    contract: contract as unknown as Contract<TState, unknown, unknown>,
    input,
    expect: options?.expect,
  };
}

export interface ScenarioDef<TState> {
  readonly id: string;
  readonly description?: string;
  readonly initial: TState;
  readonly steps: ReadonlyArray<StepDef<TState>>;
}

export type StepOutcome =
  | 'ok'
  | 'error'
  | 'unexpected_ok'
  | 'unexpected_error'
  | 'wrong_error';

export interface StepResult<TState> {
  readonly stepIndex: number;
  readonly contractId: string;
  readonly outcome: StepOutcome;
  readonly state: TState;
  readonly error?: unknown;
}

export interface ScenarioResult<TState> {
  readonly id: string;
  readonly ok: boolean;
  readonly finalState: TState;
  readonly steps: ReadonlyArray<StepResult<TState>>;
}

export type Scenario<TState> = ScenarioDef<TState> & {
  run(): ScenarioResult<TState>;
};

function executeScenario<TState>(
  def: ScenarioDef<TState>
): ScenarioResult<TState> {
  let currentState = def.initial;
  const stepResults: StepResult<TState>[] = [];

  for (let i = 0; i < def.steps.length; i++) {
    const s = def.steps[i];
    const result = s.contract(currentState, s.input);
    const expectation = s.expect ?? 'ok';

    let outcome: StepOutcome;

    if (result.ok) {
      if (expectation === 'ok') {
        outcome = 'ok';
        currentState = result.value;
      } else {
        outcome = 'unexpected_ok';
        currentState = result.value;
      }
    } else {
      if (expectation === 'ok') {
        outcome = 'unexpected_error';
      } else {
        const expectedTag = expectation.error;
        const actualTag = (result.error as { tag?: string })?.tag;
        outcome = actualTag === expectedTag ? 'error' : 'wrong_error';
      }
    }

    stepResults.push({
      stepIndex: i,
      contractId: s.contract.id,
      outcome,
      state: currentState,
      error: result.ok ? undefined : result.error,
    });
  }

  return {
    id: def.id,
    ok: stepResults.every((r) => r.outcome === 'ok' || r.outcome === 'error'),
    finalState: currentState,
    steps: stepResults,
  };
}

export function scenario<TState>(def: ScenarioDef<TState>): Scenario<TState> {
  return Object.assign({}, def, {
    run: () => executeScenario(def),
  });
}
