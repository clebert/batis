import {useMemo} from './use-memo';

export interface MutableRefObject<TValue> {
  current: TValue;
}

export function useRef<TValue>(initialValue: TValue): MutableRefObject<TValue> {
  return useMemo(() => ({current: initialValue}), []);
}
