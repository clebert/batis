import {AnyHook, Host, Slot} from '../host';
import {isFunction} from '../utils/is-function';

/**
 * Unlike React, Batis always applies all state changes, whether synchronous
 * or asynchronous, in batches.
 *
 * See related React issue: https://github.com/facebook/react/issues/15027
 */
export type SetState<TState> = (newState: TState | CreateState<TState>) => void;
export type CreateState<TState> = (prevState: TState) => TState;

export function useState<TState>(
  initialState: TState | (() => TState)
): readonly [TState, SetState<TState>] {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot(
    (otherSlot: Slot): otherSlot is StateSlot<TState> =>
      otherSlot instanceof StateSlot
  );

  if (!slot) {
    slot = setSlot(
      new StateSlot(
        host,
        isFunction<() => TState>(initialState) ? initialState() : initialState
      )
    );
  }

  return [slot.state, slot.setState];
}

class StateSlot<TState> implements Slot {
  readonly setState: SetState<TState>;

  private newStates: (TState | CreateState<TState>)[] = [];
  private disposed = false;
  private timeoutHandle: any;

  constructor(host: Host<AnyHook>, public state: TState) {
    this.setState = (newState) => {
      if (this.disposed) {
        throw new Error('A disposed state cannot be updated.');
      }

      this.newStates.push(newState);
      clearTimeout(this.timeoutHandle);

      this.timeoutHandle = setTimeout(() => host.onAsyncStateChange());
    };
  }

  applyStateChanges(): boolean {
    clearTimeout(this.timeoutHandle);

    const prevState = this.state;

    for (const newState of this.newStates) {
      this.state = isFunction<CreateState<TState>>(newState)
        ? newState(this.state)
        : newState;
    }

    this.newStates = [];

    return !Object.is(prevState, this.state);
  }

  triggerEffect(): void {}

  dispose(): void {
    clearTimeout(this.timeoutHandle);

    this.disposed = true;
  }
}
