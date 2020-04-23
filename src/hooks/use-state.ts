import {CreateInitialState, HookProcess, SetState} from '../hook-process';

export function useState<TState>(
  initialState: TState | CreateInitialState<TState>
): [TState, SetState<TState>] {
  return HookProcess.getActive().registerStateHook(initialState);
}
