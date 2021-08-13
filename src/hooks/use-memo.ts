import {Host, Slot} from '../host';
import {isUnchanged} from '../utils/is-unchanged';

export function useMemo<TValue>(
  createValue: () => TValue,
  dependencies: readonly unknown[]
): TValue {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot(
    (otherSlot: Slot): otherSlot is MemoSlot<TValue> =>
      otherSlot instanceof MemoSlot
  );

  if (!slot) {
    slot = setSlot(new MemoSlot(createValue(), dependencies));
  } else if (!isUnchanged(slot.dependencies, dependencies)) {
    slot.value = createValue();
    slot.dependencies = dependencies;
  }

  return slot.value;
}

class MemoSlot<TValue> implements Slot {
  constructor(public value: TValue, public dependencies: readonly unknown[]) {}

  applyStateChanges(): boolean {
    return false;
  }

  triggerEffect(): void {}
  dispose(): void {}
}
