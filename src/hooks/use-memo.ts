import {HookProcess} from '../hook-process';

export function useMemo<TValue>(
  createValue: () => TValue,
  dependencies: readonly unknown[]
): TValue {
  return HookProcess.getActive().registerMemoHook(createValue, dependencies);
}
