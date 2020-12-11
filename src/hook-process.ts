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

export type Hook = (...args: any[]) => any;

export interface Result<THook extends Hook>
  extends AsyncIterable<ReturnType<THook>> {
  readonly value: ReturnType<THook>;
  readonly next: Promise<IteratorResult<ReturnType<THook>, undefined>>;
}

export type CreateInitialState<TState> = () => TState;

let active: HookProcess | undefined;

export class HookProcess<THook extends Hook = Hook> {
  static getActive(): HookProcess {
    if (!active) {
      throw new Error(
        'Hooks can only be called inside the body of an active hook.'
      );
    }

    return active;
  }

  static start<THook extends Hook>(
    hook: THook,
    args: Parameters<THook>
  ): HookProcess<THook> {
    return new HookProcess<THook>(hook, args);
  }

  readonly #memory: Memory = new Memory();

  #hook: THook;
  #args: Parameters<THook>;
  #value: ReturnType<THook>;
  #stopped = false;
  #iteratorResult: Deferred<IteratorResult<ReturnType<THook>, any>> | undefined;

  constructor(hook: THook, args: Parameters<THook>) {
    this.#hook = hook;
    this.#args = args;
    this.#value = this.update(args);
  }

  get result(): Result<THook> {
    const getValue = () => {
      if (this.#stopped) {
        throw new Error('The hook process has already stopped.');
      }

      return this.#value;
    };

    return {
      get value(): ReturnType<THook> {
        return getValue();
      },

      get next(): Promise<IteratorResult<ReturnType<THook>>> {
        return this[Symbol.asyncIterator]().next();
      },

      [Symbol.asyncIterator]: () => {
        return {
          next: () => {
            if (this.#stopped) {
              throw new Error('The hook process has already stopped.');
            }

            if (this.#iteratorResult === undefined) {
              this.#iteratorResult = defer();
            }

            return this.#iteratorResult.promise;
          },
        };
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
      this.#iteratorResult?.resolve({done: true, value: undefined});
    }
  };

  readonly update = (args: Parameters<THook>): ReturnType<THook> => {
    if (this.#stopped) {
      throw new Error(
        'The hook process has already stopped and can therefore no longer be updated.'
      );
    }

    try {
      if (
        !this.#memory.isAllocated() ||
        this.#applyStateChanges() ||
        !Object.is(this.#args, args)
      ) {
        this.#args = args;

        let value: ReturnType<THook>;

        do {
          value = this.#execute(args);

          while (this.#applyStateChanges()) {
            value = this.#execute(args);
          }

          this.#cleanUpEffects();
          this.#triggerEffects();
        } while (this.#applyStateChanges());

        if (!Object.is(value, this.#value)) {
          this.#value = value;

          this.#iteratorResult = void this.#iteratorResult?.resolve({
            done: false,
            value,
          });
        }
      }
    } catch (error) {
      this.#stopped = true;

      this.#cleanUpEffects(true);
      this.#iteratorResult?.reject(error);

      throw error;
    }

    return this.#value;
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

          Promise.resolve()
            .then(() => this.update(this.#args))
            .catch(() => undefined);
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
    dependencies: readonly unknown[]
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

  readonly #execute = (args: Parameters<THook>): ReturnType<THook> => {
    active = this;

    try {
      const value = this.#hook(...args);

      this.#memory.validateAndReset();

      return value;
    } finally {
      active = undefined;
    }
  };

  readonly #applyStateChanges = (): boolean => {
    let changed = false;

    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<StateMemoryCell<unknown>>('StateMemoryCell', memoryCell)) {
        const previousState = memoryCell.state;

        for (const stateChange of memoryCell.stateChanges) {
          memoryCell.state = isFunction<CreateState<unknown>>(stateChange)
            ? stateChange(memoryCell.state)
            : stateChange;
        }

        if (!Object.is(previousState, memoryCell.state)) {
          changed = true;
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
