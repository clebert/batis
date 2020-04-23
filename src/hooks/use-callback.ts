import {useMemo} from './use-memo';

export function useCallback<TCallback>(
  callback: TCallback,
  dependencies: unknown[]
): TCallback {
  return useMemo(() => callback, dependencies);
}
