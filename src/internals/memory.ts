import {isKindOf} from './is-kind-of';

export type MemoryCell =
  | EffectMemoryCell
  | StateMemoryCell<any>
  | MemoMemoryCell<any>;

export interface EffectMemoryCell {
  readonly kind: 'EffectMemoryCell';

  outdated: boolean;
  effect: Effect;
  dependencies: readonly unknown[] | undefined;
  disposeEffect?: DisposeEffect;
}

export type Effect = () => DisposeEffect | void;
export type DisposeEffect = () => void;

export interface StateMemoryCell<TState> {
  readonly kind: 'StateMemoryCell';
  readonly setState: SetState<TState>;

  state: TState;
  stateChanges: (TState | CreateState<TState>)[];
}

export type SetState<TState> = (state: TState | CreateState<TState>) => void;
export type CreateState<TState> = (previousState: TState) => TState;

export interface MemoMemoryCell<TValue> {
  readonly kind: 'MemoMemoryCell';

  value: TValue;
  dependencies: readonly unknown[];
}

export class Memory {
  readonly memoryCells: MemoryCell[] = [];

  #allocated = false;
  #pointer = 0;

  isAllocated(): boolean {
    return this.#allocated;
  }

  validateAndReset(): void {
    if (this.#pointer !== this.memoryCells.length) {
      throw new Error('The number of hook calls must not change.');
    }

    this.#allocated = true;
    this.#pointer = 0;
  }

  next(): void {
    this.#pointer += 1;
  }

  getMemoryCell<TMemoryCell extends MemoryCell>(
    expectedKind: TMemoryCell['kind']
  ): TMemoryCell | undefined {
    const memoryCell = this.memoryCells[this.#pointer];

    if (!memoryCell && this.#allocated) {
      throw new Error('The number of hook calls must not change.');
    }

    if (memoryCell && !isKindOf<TMemoryCell>(expectedKind, memoryCell)) {
      throw new Error('The order of hook calls must not change.');
    }

    return memoryCell;
  }

  setMemoryCell<TMemoryCell extends MemoryCell>(
    memoryCell: TMemoryCell
  ): TMemoryCell {
    return (this.memoryCells[this.#pointer] = memoryCell);
  }
}
