import {CreateInitialState, HookService, SetState} from '../hook-service';

export function useState<TState>(
  initialState: TState | CreateInitialState<TState>
): [TState, SetState<TState>] {
  return HookService.active.useState(initialState);
}
