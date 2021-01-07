import {areHookInputsEqual} from './are-hook-inputs-equal';
import {isFunction} from './is-function';
import {
  CreateState,
  DisposeEffect,
  Effect,
  EffectMemoryCell,
  MemoMemoryCell,
  Memory,
  SetState,
  StateMemoryCell,
} from './memory';

export {CreateState, DisposeEffect, Effect, SetState};

export type AnyHook = (...args: any[]) => any;

export type ServiceListener<THook extends AnyHook> = (
  event: ServiceEvent<THook>
) => void;

export type ServiceEvent<THook extends AnyHook> =
  | ServiceValueEvent<THook>
  | ServiceResetEvent
  | ServiceErrorEvent;

export interface ServiceValueEvent<THook extends AnyHook> {
  readonly type: 'value';
  readonly value: ReturnType<THook>;
  readonly async: boolean;
  readonly intermediate: boolean;
}

export interface ServiceResetEvent {
  readonly type: 'reset';
}

export interface ServiceErrorEvent {
  readonly type: 'error';
  readonly error: unknown;
  readonly async: boolean;
}

let active: Service<AnyHook> | undefined;

export class Service<THook extends AnyHook> {
  static useState<TState>(
    initialState: TState | (() => TState)
  ): [TState, SetState<TState>] {
    const service = active!;

    let memoryCell = service.#memory.read<StateMemoryCell<TState>>('state');

    if (!memoryCell) {
      memoryCell = service.#memory.write({
        type: 'state',
        setState: (state) => {
          memoryCell!.stateChanges = [...memoryCell!.stateChanges, state];

          if (service !== active) {
            Promise.resolve()
              .then(() => service.#invokeAsync())
              .catch();
          }
        },
        state: isFunction(initialState) ? initialState() : initialState,
        stateChanges: [],
      });
    }

    service.#memory.movePointer();

    return [memoryCell.state, memoryCell.setState];
  }

  static useEffect(effect: Effect, dependencies?: readonly unknown[]): void {
    const service = active!;
    const memoryCell = service.#memory.read<EffectMemoryCell>('effect');

    if (!memoryCell) {
      service.#memory.write({
        type: 'effect',
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

    service.#memory.movePointer();
  }

  static useMemo<TValue>(
    createValue: () => TValue,
    dependencies: readonly unknown[]
  ): TValue {
    const service = active!;

    let memoryCell = service.#memory.read<MemoMemoryCell<TValue>>('memo');

    if (!memoryCell) {
      memoryCell = service.#memory.write({
        type: 'memo',
        value: createValue(),
        dependencies,
      });
    } else if (!areHookInputsEqual(memoryCell.dependencies, dependencies)) {
      memoryCell.value = createValue();
      memoryCell.dependencies = dependencies;
    }

    service.#memory.movePointer();

    return memoryCell.value;
  }

  static useCallback<TCallback extends (...args: any[]) => any>(
    callback: TCallback,
    dependencies: readonly unknown[]
  ): TCallback {
    return Service.useMemo(() => callback, dependencies);
  }

  static useRef<TValue>(initialValue: TValue): {current: TValue} {
    return Service.useMemo(() => ({current: initialValue}), []);
  }

  readonly #memory = new Memory();
  readonly #hook: THook;
  readonly #listener: ServiceListener<THook>;

  #args: Parameters<THook> | undefined;

  constructor(hook: THook, listener: ServiceListener<THook>) {
    this.#hook = hook;
    this.#listener = listener;
  }

  invoke(args: Parameters<THook>): void {
    this.#args = args;

    try {
      this.#invoke(false);
    } catch (error: unknown) {
      this.#memory.reset(true);
      this.#listener({type: 'error', error, async: false});
    }
  }

  reset(): void {
    this.#memory.reset(true);
    this.#listener({type: 'reset'});
  }

  readonly #invokeAsync = (): void => {
    try {
      if (this.#memory.applyStateChanges()) {
        this.#invoke(true);
      }
    } catch (error: unknown) {
      this.#memory.reset(true);
      this.#listener({type: 'error', error, async: true});
    }
  };

  readonly #invoke = (async: boolean): void => {
    let valueEvent: Omit<ServiceValueEvent<THook>, 'intermediate'> | undefined;

    do {
      do {
        if (valueEvent) {
          this.#listener({...valueEvent, intermediate: true});
        }

        try {
          active = this;

          valueEvent = {
            type: 'value',
            value: this.#hook(...this.#args!),
            async,
          };
        } finally {
          active = undefined;
        }

        this.#memory.reset();
      } while (this.#memory.applyStateChanges());

      this.#memory.triggerEffects();
    } while (this.#memory.applyStateChanges());

    this.#listener({...valueEvent, intermediate: false});
  };
}
