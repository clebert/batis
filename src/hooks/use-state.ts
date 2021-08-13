import {AnyHook, CreateState, Host, SetState, StateSlot} from '../host';
import {isFunction} from '../utils/is-function';

export function useState<TState>(
  initialState: TState | (() => TState)
): readonly [TState, SetState<TState>] {
  const host = Host.active;

  let [slot, setSlot] = host.nextSlot<TState>('state');

  if (!slot) {
    slot = setSlot(
      new StateSlotImpl(
        host,
        isFunction<() => TState>(initialState) ? initialState() : initialState
      )
    );
  }

  return [slot.state, slot.setState];
}

class StateSlotImpl<TState> implements StateSlot<TState> {
  readonly type = 'state';
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

  dispose(): void {
    clearTimeout(this.timeoutHandle);

    this.disposed = true;
  }
}
