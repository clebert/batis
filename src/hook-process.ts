import {areHookInputsEqual} from './internals/are-hook-inputs-equal';
import {Deferred, defer} from './internals/defer';
import {isFunction} from './internals/is-function';
import {isKindOf} from './internals/is-kind-of';
import {
  CleanUpEffect,
  CreateState,
  Effect,
  EffectMemoryCell,
  MemoMemoryCell,
  Memory,
  SetState,
  StateMemoryCell,
} from './internals/memory';

export {Effect, CleanUpEffect, CreateState, SetState};

export type Hook<TResultValue> = (...args: any[]) => TResultValue;

export interface HookResult<TResultValue> {
  getCurrent(): TResultValue;
  getNextAsync(): Promise<TResultValue>;
}

export type CreateInitialState<TState> = () => TState;

let active: HookProcess<Hook<unknown>, unknown> | undefined;

export class HookProcess<THook extends Hook<TResultValue>, TResultValue> {
  static getActive(): HookProcess<Hook<unknown>, unknown> {
    if (!active) {
      throw new Error(
        'Hooks can only be called inside the body of an active hook.'
      );
    }

    return active;
  }

  static start<THook extends Hook<TResultValue>, TResultValue>(
    hook: THook,
    args: Parameters<THook>
  ): HookProcess<THook, TResultValue> {
    return new HookProcess<THook, TResultValue>(hook, args);
  }

  readonly #memory: Memory = new Memory();

  #hook: THook;
  #args: Parameters<THook>;
  #current: TResultValue;
  #nextAsync: Deferred<TResultValue> | undefined;
  #stopped = false;
  #updating = false;

  constructor(hook: THook, args: Parameters<THook>) {
    this.#hook = hook;
    this.#args = args;
    this.#current = this.update(args);
  }

  get result(): HookResult<TResultValue> {
    return {
      getCurrent: () => {
        if (this.#stopped) {
          throw new Error('The hook process has already stopped.');
        }

        return this.#current;
      },

      getNextAsync: () => {
        if (this.#stopped) {
          throw new Error('The hook process has already stopped.');
        }

        if (this.#nextAsync === undefined) {
          this.#nextAsync = defer();
        }

        return this.#nextAsync.promise;
      },
    };
  }

  readonly isStopped = (): boolean => {
    return this.#stopped;
  };

  readonly stop = (): void => {
    if (!this.#stopped) {
      this.#stopped = true;

      this.#cleanUpEffects(true);

      if (this.#nextAsync) {
        this.#nextAsync.reject(new Error('The hook process has stopped.'));
        this.#nextAsync = undefined;
      }
    }
  };

  readonly update = (args: Parameters<THook>): TResultValue => {
    if (this.#stopped) {
      throw new Error(
        'The hook process has already stopped and can therefore no longer be updated.'
      );
    }

    this.#updating = true;

    try {
      if (
        !this.#memory.isAllocated() ||
        this.#applyStateChanges() ||
        !Object.is(this.#args, args)
      ) {
        this.#args = args;

        let current: TResultValue;

        do {
          current = this.#execute(args);

          while (this.#applyStateChanges()) {
            current = this.#execute(args);
          }

          this.#cleanUpEffects();
          this.#triggerEffects();
        } while (this.#applyStateChanges());

        if (!Object.is(current, this.#current)) {
          this.#current = current;

          if (this.#nextAsync) {
            this.#nextAsync.resolve(current);
            this.#nextAsync = undefined;
          }
        }
      }
    } catch (error) {
      this.#stopped = true;

      this.#cleanUpEffects(true);

      if (this.#nextAsync) {
        this.#nextAsync.reject(error);
        this.#nextAsync = undefined;
      }

      throw error;
    } finally {
      this.#updating = false;
    }

    return this.#current;
  };

  readonly registerEffectHook = (
    effect: Effect,
    dependencies?: unknown[]
  ): void => {
    if (this !== active) {
      throw new Error(
        'Please use the separately exported useEffect() function.'
      );
    }

    const memoryCell = this.#memory.getMemoryCell<EffectMemoryCell>(
      'EffectMemoryCell'
    );

    if (!memoryCell) {
      this.#memory.setMemoryCell({
        kind: 'EffectMemoryCell',
        outdated: true,
        effect,
        dependencies,
      });
    } else if (
      !areHookInputsEqual(memoryCell.dependencies, dependencies) ||
      memoryCell.outdated
    ) {
      memoryCell.outdated = true;
      memoryCell.effect = effect;
      memoryCell.dependencies = dependencies;
    }

    this.#memory.next();
  };

  readonly registerStateHook = <TState>(
    initialState: TState | CreateInitialState<TState>
  ): [TState, SetState<TState>] => {
    if (this !== active) {
      throw new Error(
        'Please use the separately exported useState() function.'
      );
    }

    let memoryCell = this.#memory.getMemoryCell<StateMemoryCell<TState>>(
      'StateMemoryCell'
    );

    if (!memoryCell) {
      memoryCell = this.#memory.setMemoryCell({
        kind: 'StateMemoryCell',
        setState: (state) => {
          memoryCell!.stateChanges = [...memoryCell!.stateChanges, state];

          if (!this.#updating) {
            this.update(this.#args);
          }
        },
        state: isFunction<CreateInitialState<TState>>(initialState)
          ? initialState()
          : initialState,
        stateChanges: [],
      });
    }

    this.#memory.next();

    return [memoryCell.state, memoryCell.setState];
  };

  readonly registerMemoHook = <TValue>(
    createValue: () => TValue,
    dependencies: unknown[]
  ): TValue => {
    if (this !== active) {
      throw new Error('Please use the separately exported useMemo() function.');
    }

    let memoryCell = this.#memory.getMemoryCell<MemoMemoryCell<TValue>>(
      'MemoMemoryCell'
    );

    if (!memoryCell) {
      memoryCell = this.#memory.setMemoryCell({
        kind: 'MemoMemoryCell',
        value: createValue(),
        dependencies,
      });
    } else if (!areHookInputsEqual(memoryCell.dependencies, dependencies)) {
      memoryCell.value = createValue();
      memoryCell.dependencies = dependencies;
    }

    this.#memory.next();

    return memoryCell.value;
  };

  readonly #execute = (args: Parameters<THook>): TResultValue => {
    active = this;

    try {
      const current = this.#hook(...args);

      this.#memory.validateAndReset();

      return current;
    } finally {
      active = undefined;
    }
  };

  readonly #applyStateChanges = (): boolean => {
    let changed = false;

    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<StateMemoryCell<unknown>>('StateMemoryCell', memoryCell)) {
        for (const stateChange of memoryCell.stateChanges) {
          const state = isFunction<CreateState<unknown>>(stateChange)
            ? stateChange(memoryCell.state)
            : stateChange;

          if (!Object.is(state, memoryCell.state)) {
            memoryCell.state = state;
            changed = true;
          }
        }

        memoryCell.stateChanges = [];
      }
    }

    return changed;
  };

  readonly #cleanUpEffects = (force = false): void => {
    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<EffectMemoryCell>('EffectMemoryCell', memoryCell)) {
        if ((memoryCell.outdated || force) && memoryCell.cleanUpEffect) {
          try {
            memoryCell.cleanUpEffect();
          } catch (error) {
            console.error('Error while cleaning up effect.', error);
          }

          memoryCell.cleanUpEffect = undefined;
        }
      }
    }
  };

  readonly #triggerEffects = (): void => {
    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<EffectMemoryCell>('EffectMemoryCell', memoryCell)) {
        if (memoryCell.outdated) {
          memoryCell.outdated = false;
          memoryCell.cleanUpEffect = memoryCell.effect() || undefined;
        }
      }
    }
  };
}
