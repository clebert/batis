import {CreateInitialState, Service, SetState} from '../service';

export function useState<TState>(
  initialState: TState | CreateInitialState<TState>
): [TState, SetState<TState>] {
  return Service.active.useState(initialState);
}
