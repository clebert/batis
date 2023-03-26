import type {Slot} from '../host.js';

import {Host} from '../host.js';
import {isUnchanged} from '../utils/is-unchanged.js';

export type Effect = () => (() => void) | void;

export function useEffect(
  effect: Effect,
  dependencies?: readonly unknown[],
): void {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot(
    (otherSlot: Slot): otherSlot is AsyncEffectSlot =>
      otherSlot instanceof AsyncEffectSlot,
  );

  if (!slot) {
    slot = setSlot(new AsyncEffectSlot(effect, dependencies));
  } else {
    slot.update(effect, dependencies);
  }
}

export function useLayoutEffect(
  effect: Effect,
  dependencies?: readonly unknown[],
): void {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot(
    (otherSlot: Slot): otherSlot is SyncEffectSlot =>
      otherSlot instanceof SyncEffectSlot,
  );

  if (!slot) {
    slot = setSlot(new SyncEffectSlot(effect, dependencies));
  } else {
    slot.update(effect, dependencies);
  }
}

class EffectSlot implements Slot {
  private state:
    | {readonly triggered: false; readonly effect: Effect}
    | {readonly triggered: true; dispose?(): void};

  constructor(
    private readonly async: boolean,
    effect: Effect,
    private dependencies: readonly unknown[] | undefined,
  ) {
    this.state = {triggered: false, effect};
  }

  update(effect: Effect, dependencies: readonly unknown[] | undefined): void {
    if (!isUnchanged(this.dependencies, dependencies)) {
      this.dispose();

      this.state = {triggered: false, effect};
      this.dependencies = dependencies;
    }
  }

  applyStateChanges(): boolean {
    return false;
  }

  triggerEffect(async: boolean = false): void {
    if (!this.state.triggered && async === this.async) {
      this.state = {triggered: true, dispose: this.state.effect()!};
    }
  }

  dispose(): void {
    if (this.state.triggered) {
      try {
        this.state.dispose?.();
      } catch (error) {
        console.error(`An effect could not be disposed.`, error);
      }
    }
  }
}

class AsyncEffectSlot extends EffectSlot {
  constructor(effect: Effect, dependencies: readonly unknown[] | undefined) {
    super(true, effect, dependencies);
  }
}

class SyncEffectSlot extends EffectSlot {
  constructor(effect: Effect, dependencies: readonly unknown[] | undefined) {
    super(false, effect, dependencies);
  }
}
