import {Deferred, defer} from './utils/defer';

export type Slot =
  | AsyncEffectSlot
  | SyncEffectSlot
  | MemoSlot<unknown>
  | StateSlot<unknown>;

export interface AsyncEffectSlot extends EffectSlot {
  readonly type: 'async-effect';
}

export interface SyncEffectSlot extends EffectSlot {
  readonly type: 'sync-effect';
}

export interface EffectSlot {
  trigger(): void;
  update(effect: Effect, dependencies: readonly unknown[] | undefined): void;
  dispose(): void;
}

export type Effect = () => (() => void) | void;

export interface MemoSlot<TValue> {
  readonly type: 'memo';
  readonly value: TValue;

  update(createValue: () => TValue, dependencies: readonly unknown[]): void;
}

export interface StateSlot<TState> {
  readonly type: 'state';
  readonly state: TState;
  readonly setState: SetState<TState>;

  /**
   * Unlike React, Batis always applies all state changes, whether synchronous
   * or asynchronous, in batches.
   *
   * See related React issue: https://github.com/facebook/react/issues/15027
   */
  applyStateChanges(): boolean;
  dispose(): void;
}

export type SetState<TState> = (newState: TState | CreateState<TState>) => void;
export type CreateState<TState> = (prevState: TState) => TState;
export type AnyHook = (...args: any[]) => any;

export class Host<THook extends AnyHook> {
  private static activeHost: Host<AnyHook> | undefined;

  static get active(): Host<AnyHook> {
    if (!this.activeHost) {
      throw new Error('A Hook cannot be used without an active host.');
    }

    return this.activeHost;
  }

  private slots: Slot[] = [];
  private slotsAllocated = false;
  private slotIndex = 0;
  private asyncStateChange: Deferred<void> | undefined;
  private args: Parameters<THook> | undefined;

  constructor(private readonly hook: THook) {}

  get nextAsyncStateChange(): Promise<void> {
    if (!this.asyncStateChange) {
      this.asyncStateChange = defer();
    }

    return this.asyncStateChange.promise;
  }

  run(
    ...args: Parameters<THook>
  ): readonly [ReturnType<THook>, ...ReturnType<THook>[]] {
    this.args = args;

    try {
      this.triggerEffects({async: true});
      this.applyStateChanges();

      let results: [ReturnType<THook>, ...ReturnType<THook>[]] | undefined;

      do {
        do {
          try {
            Host.activeHost = this;

            const result = this.hook(...args!);

            if (results) {
              results.unshift(result);
            } else {
              results = [result];
            }
          } finally {
            Host.activeHost = undefined;
          }

          if (this.slotIndex !== this.slots.length) {
            throw new Error('The number of Hooks used must not change.');
          }

          this.slotsAllocated = true;
          this.slotIndex = 0;
        } while (this.applyStateChanges());

        this.triggerEffects({async: false});
      } while (this.applyStateChanges());

      return results;
    } catch (error: unknown) {
      this.reset();

      throw error;
    }
  }

  /**
   * Starts another run with the same arguments as before.
   */
  rerun(): readonly [ReturnType<THook>, ...ReturnType<THook>[]] {
    if (!this.args) {
      throw new Error('A Hook that has never been run cannot be rerun.');
    }

    return this.run(...this.args);
  }

  /**
   * Resets the state and disposes all effects, the next run starts from
   * scratch.
   */
  reset(): void {
    for (const slot of this.slots) {
      if (
        slot.type === 'async-effect' ||
        slot.type === 'sync-effect' ||
        slot.type === 'state'
      ) {
        slot.dispose();
      }
    }

    this.slots = [];
    this.slotsAllocated = false;
    this.slotIndex = 0;
  }

  /**
   * Triggers all asynchronous effects manually, otherwise they will be
   * triggered automatically at the beginning of the next run.
   */
  triggerAsyncEffects(): void {
    try {
      this.triggerEffects({async: true});
    } catch (error: unknown) {
      this.reset();

      throw error;
    }
  }

  nextSlot(
    type: 'async-effect'
  ): [
    AsyncEffectSlot | undefined,
    (newSlot: AsyncEffectSlot) => AsyncEffectSlot
  ];

  nextSlot(
    type: 'sync-effect'
  ): [SyncEffectSlot | undefined, (newSlot: SyncEffectSlot) => SyncEffectSlot];

  nextSlot<TValue>(
    type: 'memo'
  ): [
    MemoSlot<TValue> | undefined,
    (newSlot: MemoSlot<TValue>) => MemoSlot<TValue>
  ];

  nextSlot<TState>(
    type: 'state'
  ): [
    StateSlot<TState> | undefined,
    (newSlot: StateSlot<TState>) => StateSlot<TState>
  ];

  nextSlot<TSlot extends Slot>(
    type: Slot['type']
  ): [TSlot | undefined, (newSlot: TSlot) => TSlot] {
    const slotIndex = this.slotIndex++;
    const slot = this.slots[slotIndex];

    if (!slot && this.slotsAllocated) {
      throw new Error('The number of Hooks used must not change.');
    }

    if (slot && slot.type !== type) {
      throw new Error('The order of the Hooks used must not change.');
    }

    return [
      slot as TSlot | undefined,
      (newSlot) => (this.slots[slotIndex] = newSlot) as TSlot,
    ];
  }

  onAsyncStateChange(): void {
    this.asyncStateChange?.resolve();

    this.asyncStateChange = undefined;
  }

  private triggerEffects({async}: {readonly async: boolean}): void {
    for (const slot of this.slots) {
      if (
        (async && slot.type === 'async-effect') ||
        (!async && slot.type === 'sync-effect')
      ) {
        slot.trigger();
      }
    }
  }

  private applyStateChanges(): boolean {
    let changed = false;

    for (const slot of this.slots) {
      if (slot.type === 'state' && slot.applyStateChanges()) {
        changed = true;
      }
    }

    return changed;
  }
}
