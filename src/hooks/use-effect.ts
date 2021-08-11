import {Effect, EffectSlot, Host} from '../host';
import {isUnchanged} from '../utils/is-unchanged';

export function useEffect(
  effect: Effect,
  dependencies?: readonly unknown[]
): void {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot('async-effect');

  if (!slot) {
    slot = setSlot(new AsyncEffectSlotImpl(effect, dependencies));
  } else {
    slot.update(effect, dependencies);
  }
}

export function useLayoutEffect(
  effect: Effect,
  dependencies?: readonly unknown[]
): void {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot('sync-effect');

  if (!slot) {
    slot = setSlot(new SyncEffectSlotImpl(effect, dependencies));
  } else {
    slot.update(effect, dependencies);
  }
}

class EffectSlotImpl implements EffectSlot {
  private state:
    | {readonly triggered: false; readonly effect: Effect}
    | {readonly triggered: true; dispose?(): void};

  constructor(
    effect: Effect,
    private dependencies: readonly unknown[] | undefined
  ) {
    this.state = {triggered: false, effect};
  }

  trigger(): void {
    if (!this.state.triggered) {
      this.state = {triggered: true, dispose: this.state.effect()!};
    }
  }

  update(effect: Effect, dependencies: readonly unknown[] | undefined): void {
    if (!isUnchanged(this.dependencies, dependencies)) {
      this.dispose();

      this.state = {triggered: false, effect};
      this.dependencies = dependencies;
    }
  }

  dispose(): void {
    if (this.state.triggered) {
      try {
        this.state.dispose?.();
      } catch (error) {
        console.error('An effect could not be disposed.', error);
      }
    }
  }
}

class AsyncEffectSlotImpl extends EffectSlotImpl {
  readonly type = 'async-effect';
}

class SyncEffectSlotImpl extends EffectSlotImpl {
  readonly type = 'sync-effect';
}
