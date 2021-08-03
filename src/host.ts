import {areDependenciesEqual} from './are-dependencies-equal';
import {Deferred, defer} from './defer';
import {isFunction} from './is-function';
import {
  Effect,
  EffectMemoryCell,
  MemoMemoryCell,
  Memory,
  SetState,
  StateMemoryCell,
} from './memory';

export interface BatisHooks {
  useState<TState>(
    initialState: TState | (() => TState)
  ): readonly [TState, SetState<TState>];

  useEffect(effect: Effect, dependencies?: readonly unknown[]): void;

  useMemo<TValue>(
    createValue: () => TValue,
    dependencies: readonly unknown[]
  ): TValue;

  useCallback<TCallback extends (...args: any[]) => any>(
    callback: TCallback,
    dependencies: readonly unknown[]
  ): TCallback;

  useRef<TValue>(initialValue: TValue): {current: TValue};

  useReducer<TState, TAction>(
    reducer: Reducer<TState, TAction>,
    initialArg: TState
  ): [TState, Dispatch<TAction>];

  useReducer<TArg, TState, TAction>(
    reducer: Reducer<TState, TAction>,
    initialArg: TArg,
    init: ReducerInit<TArg, TState>
  ): [TState, Dispatch<TAction>];
}

export type Reducer<TState, TAction> = (
  previousState: TState,
  action: TAction
) => TState;

export type Dispatch<TAction> = (action: TAction) => void;
export type ReducerInit<TArg, TState> = (initialArg: TArg) => TState;
export type AnyHook = (...args: any[]) => any;

export class Host<THook extends AnyHook> {
  static readonly Hooks: BatisHooks = {
    useState<TState>(
      initialState: TState | (() => TState)
    ): readonly [TState, SetState<TState>] {
      const host = Host.#getActiveHost();

      let memoryCell = host.#memory.read<StateMemoryCell<TState>>('state');

      if (!memoryCell) {
        memoryCell = host.#memory.write({
          type: 'state',
          setState: (state) => {
            memoryCell!.stateChanges = [...memoryCell!.stateChanges, state];

            if (!Host.#running) {
              Promise.resolve()
                .then(() => {
                  try {
                    if (host.#memory.applyStateChanges()) {
                      host.#onAsyncStateChange();
                    }
                  } catch (error: unknown) {
                    host.#onAsyncStateChange(
                      error instanceof Error ? error : new Error(String(error))
                    );
                  }
                })
                .catch();
            }
          },
          state: isFunction(initialState) ? initialState() : initialState,
          stateChanges: [],
        });
      }

      host.#memory.movePointer();

      return [memoryCell.state, memoryCell.setState];
    },

    useEffect(effect: Effect, dependencies?: readonly unknown[]): void {
      const host = Host.#getActiveHost();
      const memoryCell = host.#memory.read<EffectMemoryCell>('effect');

      if (!memoryCell) {
        host.#memory.write({
          type: 'effect',
          outdated: true,
          effect,
          dependencies,
        });
      } else if (
        !areDependenciesEqual(memoryCell.dependencies, dependencies) ||
        memoryCell.outdated
      ) {
        memoryCell.outdated = true;
        memoryCell.effect = effect;
        memoryCell.dependencies = dependencies;
      }

      host.#memory.movePointer();
    },

    useMemo<TValue>(
      createValue: () => TValue,
      dependencies: readonly unknown[]
    ): TValue {
      const host = Host.#getActiveHost();

      let memoryCell = host.#memory.read<MemoMemoryCell<TValue>>('memo');

      if (!memoryCell) {
        memoryCell = host.#memory.write({
          type: 'memo',
          value: createValue(),
          dependencies,
        });
      } else if (!areDependenciesEqual(memoryCell.dependencies, dependencies)) {
        memoryCell.value = createValue();
        memoryCell.dependencies = dependencies;
      }

      host.#memory.movePointer();

      return memoryCell.value;
    },

    useCallback<TCallback extends (...args: any[]) => any>(
      callback: TCallback,
      dependencies: readonly unknown[]
    ): TCallback {
      return Host.Hooks.useMemo(() => callback, dependencies);
    },

    useRef<TValue>(initialValue: TValue): {current: TValue} {
      return Host.Hooks.useMemo(() => ({current: initialValue}), []);
    },

    useReducer<TArg, TState, TAction>(
      reducer: Reducer<TState, TAction>,
      initialArg: TArg | TState,
      init?: ReducerInit<TArg, TState>
    ): [TState, Dispatch<TAction>] {
      const [state, setState] = Host.Hooks.useState<TState>(
        init ? () => init(initialArg as TArg) : (initialArg as TState)
      );

      const dispatch: Dispatch<TAction> = Host.Hooks.useCallback(
        (action) => setState((previousState) => reducer(previousState, action)),
        []
      );

      return [state, dispatch];
    },
  };

  static #running = false;
  static #activeHost: Host<AnyHook> | undefined;

  static #getActiveHost(): Host<AnyHook> {
    if (!this.#activeHost) {
      throw new Error('A Hook cannot be used without an active host.');
    }

    return this.#activeHost;
  }

  readonly #memory = new Memory();
  readonly #hook: THook;

  #nextAsyncStateChange: Deferred<void> | undefined;

  constructor(hook: THook) {
    this.#hook = hook;
  }

  get nextAsyncStateChange(): Promise<void> {
    if (!this.#nextAsyncStateChange) {
      this.#nextAsyncStateChange = defer();
    }

    return this.#nextAsyncStateChange.promise;
  }

  /**
   * @deprecated This method will be removed in one of the next versions.
   */
  render(
    ...args: Parameters<THook>
  ): readonly [ReturnType<THook>, ...ReturnType<THook>[]] {
    return this.run(...args);
  }

  run(
    ...args: Parameters<THook>
  ): readonly [ReturnType<THook>, ...ReturnType<THook>[]] {
    try {
      Host.#running = true;

      let results: [ReturnType<THook>, ...ReturnType<THook>[]] | undefined;

      this.#memory.applyStateChanges();

      do {
        do {
          try {
            Host.#activeHost = this;

            const result = this.#hook(...args!);

            if (results) {
              results.unshift(result);
            } else {
              results = [result];
            }
          } finally {
            Host.#activeHost = undefined;
          }

          this.#memory.reset();
        } while (this.#memory.applyStateChanges());

        this.#memory.triggerEffects();
      } while (this.#memory.applyStateChanges());

      return results;
    } catch (error: unknown) {
      this.reset();

      throw error;
    } finally {
      Host.#running = false;
    }
  }

  /**
   * Reset the state and clean up all side effects.
   * The next run will start from scratch.
   */
  reset(): void {
    this.#memory.reset(true);
  }

  #onAsyncStateChange(error?: Error): void {
    try {
      if (error) {
        this.reset();
        this.#nextAsyncStateChange?.reject(error);
      } else {
        this.#nextAsyncStateChange?.resolve();
      }
    } finally {
      this.#nextAsyncStateChange = undefined;
    }
  }
}
