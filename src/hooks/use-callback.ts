import {useMemo} from './use-memo.js';

export function useCallback<TCallback extends (...args: any[]) => any>(
  callback: TCallback,
  dependencies: readonly unknown[],
): TCallback {
  return useMemo(() => callback, dependencies);
}
