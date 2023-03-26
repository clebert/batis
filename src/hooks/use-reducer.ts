import {useCallback} from './use-callback.js';
import {useState} from './use-state.js';

export type Reducer<TState, TAction> = (
  prevState: TState,
  action: TAction,
) => TState;

export type Dispatch<TAction> = (action: TAction) => void;
export type ReducerInit<TArg, TState> = (initialArg: TArg) => TState;

export function useReducer<TArg, TState, TAction>(
  reducer: Reducer<TState, TAction>,
  initialArg: TArg | TState,
  init?: ReducerInit<TArg, TState>,
): [TState, Dispatch<TAction>] {
  const [state, setState] = useState<TState>(
    init ? () => init(initialArg as TArg) : (initialArg as TState),
  );

  const dispatch: Dispatch<TAction> = useCallback(
    (action) => setState((prevState) => reducer(prevState, action)),
    [],
  );

  return [state, dispatch];
}
