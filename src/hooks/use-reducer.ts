import {useCallback} from './use-callback';
import {useState} from './use-state';

export type Reducer<TState, TAction> = (
  previousState: TState,
  action: TAction
) => TState;

export type Init<TArg, TState> = (initialArg: TArg) => TState;
export type Dispatch<TAction> = (action: TAction) => void;

export function useReducer<TState, TAction>(
  reducer: Reducer<TState, TAction>,
  initialArg: TState
): [TState, Dispatch<TAction>];

export function useReducer<TArg, TState, TAction>(
  reducer: Reducer<TState, TAction>,
  initialArg: TArg,
  init: Init<TArg, TState>
): [TState, Dispatch<TAction>];

export function useReducer<TArg, TState, TAction>(
  reducer: Reducer<TState, TAction>,
  initialArg: TArg | TState,
  init?: Init<TArg, TState>
): [TState, Dispatch<TAction>] {
  const [state, setState] = useState<TState>(
    init ? () => init(initialArg as TArg) : (initialArg as TState)
  );

  const dispatch: Dispatch<TAction> = useCallback(
    (action) => setState((previousState) => reducer(previousState, action)),
    []
  );

  return [state, dispatch];
}
