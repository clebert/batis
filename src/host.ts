import {type Deferred, defer} from './utils/defer.js';

export type AnyHook = (...args: any[]) => any;

export interface Slot {
  applyStateChanges(): boolean;
  triggerEffect(async?: boolean): void;
  dispose(): void;
}

export class Host<THook extends AnyHook> {
  private static activeHost: Host<AnyHook> | undefined;

  static get active(): Host<AnyHook> {
    if (!this.activeHost) {
      throw new Error(`A Hook cannot be used without an active host.`);
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
      for (const slot of this.slots) {
        slot.triggerEffect(true);
      }

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
            throw new Error(`The number of Hooks used must not change.`);
          }

          this.slotsAllocated = true;
          this.slotIndex = 0;
        } while (this.applyStateChanges());

        for (const slot of this.slots) {
          slot.triggerEffect();
        }
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
      throw new Error(`A Hook that has never been run cannot be rerun.`);
    }

    return this.run(...this.args);
  }

  /**
   * Resets the state and disposes all effects, the next run starts from
   * scratch.
   */
  reset(): void {
    for (const slot of this.slots) {
      slot.dispose();
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
      for (const slot of this.slots) {
        slot.triggerEffect(true);
      }
    } catch (error: unknown) {
      this.reset();

      throw error;
    }
  }

  nextSlot<TSlot extends Slot>(
    predicate: (slot: Slot) => slot is TSlot,
  ): [TSlot | undefined, (newSlot: TSlot) => TSlot] {
    const slotIndex = this.slotIndex++;
    const slot = this.slots[slotIndex];

    if (!slot && this.slotsAllocated) {
      throw new Error(`The number of Hooks used must not change.`);
    }

    if (slot && !predicate(slot)) {
      throw new Error(`The order of the Hooks used must not change.`);
    }

    return [
      slot,
      (newSlot) => {
        this.slots[slotIndex] = newSlot;

        return newSlot;
      },
    ];
  }

  onAsyncStateChange(): void {
    this.asyncStateChange?.resolve();

    this.asyncStateChange = undefined;
  }

  private applyStateChanges(): boolean {
    let changed = false;

    for (const slot of this.slots) {
      if (slot.applyStateChanges()) {
        changed = true;
      }
    }

    return changed;
  }
}
