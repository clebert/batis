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
  | RenderingEvent<TAgent>
  | ResetEvent
  | ErrorEvent;

export interface RenderingEvent<TAgent extends AnyAgent> {
  readonly type: 'rendering';
  readonly result: ReturnType<TAgent>;
  readonly async?: true;
  readonly interim?: true;
}

/**
 * The host has lost its state and all side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
export interface ResetEvent {
  readonly type: 'reset';
}

/**
 * The host has lost its state and all side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
export interface ErrorEvent {
  readonly type: 'error';
  readonly reason: unknown;
  readonly async?: true;
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
              .then(() => host.#renderAsynchronously())
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
      this.#render();
    } catch (reason: unknown) {
      this.#memory.reset(true);
      this.#eventListener({type: 'error', reason});
    }
  }

  /**
   * Reset the state and clean up all side effects.
   * The next rendering will start from scratch.
   */
  reset(): void {
    this.#memory.reset(true);
    this.#eventListener({type: 'reset'});
  }

  readonly #renderAsynchronously = (): void => {
    try {
      if (this.#memory.applyStateChanges()) {
        this.#render(true);
      }
    } catch (reason: unknown) {
      this.#memory.reset(true);
      this.#eventListener({type: 'error', reason, async: true});
    }
  };

  readonly #render = (async?: true): void => {
    let renderingEvent: Omit<RenderingEvent<TAgent>, 'interim'> | undefined;

    try {
      activeHost = this;

      do {
        do {
          if (renderingEvent) {
            this.#eventListener({...renderingEvent, interim: true});
          }

          const result = this.#agent(...this.#args!);

          renderingEvent = async
            ? {type: 'rendering', result, async}
            : {type: 'rendering', result};

          this.#memory.reset();
        } while (this.#memory.applyStateChanges());

        this.#memory.triggerEffects();
      } while (this.#memory.applyStateChanges());
    } finally {
      activeHost = undefined;
    }

    this.#eventListener(renderingEvent);
  };
}
