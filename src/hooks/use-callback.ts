import {useMemo} from './use-memo';

export function useCallback<TCallback extends (...args: any[]) => any>(
  callback: TCallback,
  dependencies: readonly unknown[]
): TCallback {
  return useMemo(() => callback, dependencies);
}
