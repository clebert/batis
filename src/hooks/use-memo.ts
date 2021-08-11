import {Host, MemoSlot} from '../host';
import {isUnchanged} from '../utils/is-unchanged';

export function useMemo<TValue>(
  createValue: () => TValue,
  dependencies: readonly unknown[]
): TValue {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot<TValue>('memo');

  if (!slot) {
    slot = setSlot(new MemoSlotImpl(createValue(), dependencies));
  } else {
    slot.update(createValue, dependencies);
  }

  return slot.value;
}

class MemoSlotImpl<TValue> implements MemoSlot<TValue> {
  readonly type = 'memo';

  constructor(public value: TValue, private dependencies: readonly unknown[]) {}

  update(createValue: () => TValue, dependencies: readonly unknown[]): void {
    if (!isUnchanged(this.dependencies, dependencies)) {
      this.value = createValue();
      this.dependencies = dependencies;
    }
  }
}
