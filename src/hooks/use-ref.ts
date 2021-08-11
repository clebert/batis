import {useMemo} from './use-memo';

export function useRef<TValue>(initialValue: TValue): {current: TValue} {
  return useMemo(() => ({current: initialValue}), []);
}
