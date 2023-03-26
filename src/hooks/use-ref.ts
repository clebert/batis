import {useMemo} from './use-memo.js';

export function useRef<TValue>(initialValue: TValue): {current: TValue} {
  return useMemo(() => ({current: initialValue}), []);
}
