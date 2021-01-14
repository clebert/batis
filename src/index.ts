import {areDependenciesEqual} from './are-dependencies-equal';
import {isFunction} from './is-function';
import {
  CleanUpEffect,
  CreateState,
  Effect,
  EffectMemoryCell,
  MemoMemoryCell,
  Memory,
  SetState,
  StateMemoryCell,
} from './memory';

export {CleanUpEffect, CreateState, Effect, SetState};

export type AnyAgent = (...args: any[]) => any;

export type HostEventListener<TAgent extends AnyAgent> = (
  event: HostEvent<TAgent>
) => void;

export type HostEvent<TAgent extends AnyAgent> =
  | HostValueEvent<TAgent>
  | HostResetEvent
  | HostErrorEvent;

export interface HostValueEvent<TAgent extends AnyAgent> {
  readonly type: 'value';
  readonly value: ReturnType<TAgent>;
  readonly async: boolean;
  readonly intermediate: boolean;
}

/**
 * The host has lost its state and the side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
export interface HostResetEvent {
  readonly type: 'reset';
}

/**
 * The host has lost its state and the side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
export interface HostErrorEvent {
  readonly type: 'error';
  readonly error: unknown;
  readonly async: boolean;
}

let activeHost: Host<AnyAgent> | undefined;

export class Host<TAgent extends AnyAgent> {
  static useState<TState>(
    initialState: TState | (() => TState)
  ): readonly [TState, SetState<TState>] {
    const host = activeHost!;

    let memoryCell = host.#memory.read<StateMemoryCell<TState>>('state');

    if (!memoryCell) {
      memoryCell = host.#memory.write({
        type: 'state',
        setState: (state) => {
          memoryCell!.stateChanges = [...memoryCell!.stateChanges, state];

          if (host !== activeHost) {
            Promise.resolve()
              .then(() => host.#renderAsync())
              .catch();
          }
        },
        state: isFunction(initialState) ? initialState() : initialState,
        stateChanges: [],
      });
    }

    host.#memory.movePointer();

    return [memoryCell.state, memoryCell.setState];
  }

  static useEffect(effect: Effect, dependencies?: readonly unknown[]): void {
    const host = activeHost!;
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
  }

  static useMemo<TValue>(
    createValue: () => TValue,
    dependencies: readonly unknown[]
  ): TValue {
    const host = activeHost!;

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
  }

  static useCallback<TCallback extends (...args: any[]) => any>(
    callback: TCallback,
    dependencies: readonly unknown[]
  ): TCallback {
    return Host.useMemo(() => callback, dependencies);
  }

  static useRef<TValue>(initialValue: TValue): {current: TValue} {
    return Host.useMemo(() => ({current: initialValue}), []);
  }

  readonly #memory = new Memory();
  readonly #agent: TAgent;
  readonly #eventListener: HostEventListener<TAgent>;

  #args: Parameters<TAgent> | undefined;

  constructor(agent: TAgent, eventListener: HostEventListener<TAgent>) {
    this.#agent = agent;
    this.#eventListener = eventListener;
  }

  render(...args: Parameters<TAgent>): void {
    this.#args = args;

    try {
      this.#render(false);
    } catch (error: unknown) {
      this.#memory.reset(true);
      this.#eventListener({type: 'error', error, async: false});
    }
  }

  /**
   * Reset the state and clean up the side effects.
   * The next rendering will start from scratch.
   */
  reset(): void {
    this.#memory.reset(true);
    this.#eventListener({type: 'reset'});
  }

  readonly #renderAsync = (): void => {
    try {
      if (this.#memory.applyStateChanges()) {
        this.#render(true);
      }
    } catch (error: unknown) {
      this.#memory.reset(true);
      this.#eventListener({type: 'error', error, async: true});
    }
  };

  readonly #render = (async: boolean): void => {
    let valueEvent: Omit<HostValueEvent<TAgent>, 'intermediate'> | undefined;

    do {
      do {
        if (valueEvent) {
          this.#eventListener({...valueEvent, intermediate: true});
        }

        try {
          activeHost = this;

          valueEvent = {
            type: 'value',
            value: this.#agent(...this.#args!),
            async,
          };
        } finally {
          activeHost = undefined;
        }

        this.#memory.reset();
      } while (this.#memory.applyStateChanges());

      this.#memory.triggerEffects();
    } while (this.#memory.applyStateChanges());

    this.#eventListener({...valueEvent, intermediate: false});
  };
}
