import {areHookInputsEqual} from './internals/are-hook-inputs-equal';
import {isFunction} from './internals/is-function';
import {isKindOf} from './internals/is-kind-of';
import {
  CreateState,
  DisposeEffect,
  Effect,
  EffectMemoryCell,
  MemoMemoryCell,
  Memory,
  SetState,
  StateMemoryCell,
} from './internals/memory';

export {CreateState, DisposeEffect, Effect, SetState};

export type AnyHook = (...args: any[]) => any;

export type ServiceListener<THook extends AnyHook> = (
  event: ServiceEvent<THook>
) => void;

export type ServiceEvent<THook extends AnyHook> =
  | ServiceValueEvent<THook>
  | ServiceErrorEvent;

export interface ServiceValueEvent<THook extends AnyHook> {
  readonly type: 'value';
  readonly value: ReturnType<THook>;
}

export interface ServiceErrorEvent {
  readonly type: 'error';
  readonly error: unknown;
}

export type CreateInitialState<TState> = () => TState;

let active: Service<AnyHook> | undefined;

export class Service<THook extends AnyHook> {
  static get active(): Service<AnyHook> {
    if (!active) {
      throw new Error(
        'Hooks may only be invoked within the body of an active service.'
      );
    }

    return active;
  }

  readonly #memory = new Memory();
  readonly #hook: THook;
  readonly #listener: ServiceListener<THook>;

  #args: Parameters<THook>;

  constructor(
    hook: THook,
    args: Parameters<THook>,
    listener: ServiceListener<THook>
  ) {
    this.#hook = hook;
    this.#args = args;
    this.#listener = listener;

    this.update(args);
  }

  disposeEffects(): void {
    this.#disposeEffects(true);
  }

  update(args: Parameters<THook>): void {
    try {
      if (
        !this.#memory.isAllocated() ||
        this.#applyStateChanges() ||
        this.#args !== args
      ) {
        this.#args = args;

        do {
          do {
            let value: ReturnType<THook>;

            try {
              active = this;
              value = this.#hook(...args);
            } finally {
              active = undefined;
            }

            this.#memory.validateAndReset();

            this.#listener({type: 'value', value});
          } while (this.#applyStateChanges());

          this.#disposeEffects();
          this.#triggerEffects();
        } while (this.#applyStateChanges());
      }
    } catch (error: unknown) {
      this.#listener({type: 'error', error});
    }
  }

  useEffect(effect: Effect, dependencies?: unknown[]): void {
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
  }

  useMemo<TValue>(
    createValue: () => TValue,
    dependencies: readonly unknown[]
  ): TValue {
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
  }

  useState<TState>(
    initialState: TState | CreateInitialState<TState>
  ): [TState, SetState<TState>] {
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

          if (this !== active) {
            Promise.resolve()
              .then(() => this.update(this.#args))
              .catch();
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
  }

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

  readonly #disposeEffects = (force: boolean = false): void => {
    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<EffectMemoryCell>('EffectMemoryCell', memoryCell)) {
        if ((memoryCell.outdated || force) && memoryCell.disposeEffect) {
          try {
            memoryCell.disposeEffect();
          } catch (error) {
            console.error('Failed to dispose an effect.', error);
          }

          memoryCell.disposeEffect = undefined;
        }
      }
    }
  };

  readonly #triggerEffects = (): void => {
    for (const memoryCell of this.#memory.memoryCells) {
      if (isKindOf<EffectMemoryCell>('EffectMemoryCell', memoryCell)) {
        if (memoryCell.outdated) {
          memoryCell.outdated = false;
          memoryCell.disposeEffect = memoryCell.effect() || undefined;
        }
      }
    }
  };
}
