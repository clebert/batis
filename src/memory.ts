import {isFunction} from './is-function';
import {isTypeOf} from './is-type-of';

export type MemoryCell =
  | EffectMemoryCell
  | StateMemoryCell<any>
  | MemoMemoryCell<any>;

export interface EffectMemoryCell {
  readonly type: 'effect';

  outdated: boolean;
  effect: Effect;
  dependencies: readonly unknown[] | undefined;
  cleanUpEffect?: CleanUpEffect;
}

export type Effect = () => CleanUpEffect | void;
export type CleanUpEffect = () => void;

export interface StateMemoryCell<TState> {
  readonly type: 'state';
  readonly setState: SetState<TState>;

  state: TState;
  stateChanges: (TState | CreateState<TState>)[];
}

/**
 * Unlike React, Batis always applies all state changes, whether synchronous
 * or asynchronous, in batches.
 *
 * See related React issue: https://github.com/facebook/react/issues/15027
 */
export type SetState<TState> = (state: TState | CreateState<TState>) => void;
export type CreateState<TState> = (previousState: TState) => TState;

export interface MemoMemoryCell<TValue> {
  readonly type: 'memo';

  value: TValue;
  dependencies: readonly unknown[];
}

export class Memory {
  #memoryCells: MemoryCell[] = [];
  #allocated = false;
  #pointer = 0;

  reset(hard: boolean = false): void {
    if (hard) {
      this.#cleanUpEffects(true);

      this.#memoryCells = [];
    } else if (this.#pointer !== this.#memoryCells.length) {
      throw new Error('The number of subagents used must not change.');
    }

    this.#allocated = !hard;
    this.#pointer = 0;
  }

  read<TMemoryCell extends MemoryCell>(
    expectedType: TMemoryCell['type']
  ): TMemoryCell | undefined {
    const memoryCell = this.#memoryCells[this.#pointer];

    if (!memoryCell && this.#allocated) {
      throw new Error('The number of subagents used must not change.');
    }

    if (memoryCell && !isTypeOf<TMemoryCell>(expectedType, memoryCell)) {
      throw new Error('The order of the subagents used must not change.');
    }

    return memoryCell;
  }

  write<TMemoryCell extends MemoryCell>(memoryCell: TMemoryCell): TMemoryCell {
    return (this.#memoryCells[this.#pointer] = memoryCell);
  }

  movePointer(): void {
    this.#pointer += 1;
  }

  applyStateChanges(): boolean {
    let changed = false;

    for (const memoryCell of this.#memoryCells) {
      if (isTypeOf<StateMemoryCell<unknown>>('state', memoryCell)) {
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
  }

  triggerEffects(): void {
    this.#cleanUpEffects();

    for (const memoryCell of this.#memoryCells) {
      if (isTypeOf<EffectMemoryCell>('effect', memoryCell)) {
        if (memoryCell.outdated) {
          memoryCell.outdated = false;
          memoryCell.cleanUpEffect = memoryCell.effect() || undefined;
        }
      }
    }
  }

  readonly #cleanUpEffects = (force: boolean = false): void => {
    for (const memoryCell of this.#memoryCells) {
      if (isTypeOf<EffectMemoryCell>('effect', memoryCell)) {
        if ((memoryCell.outdated || force) && memoryCell.cleanUpEffect) {
          try {
            memoryCell.cleanUpEffect();
          } catch (error) {
            console.error('An effect could not be cleaned up.', error);
          }

          memoryCell.cleanUpEffect = undefined;
        }
      }
    }
  };
}
