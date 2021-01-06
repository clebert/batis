import {Service} from '../service';

export function useMemo<TValue>(
  createValue: () => TValue,
  dependencies: readonly unknown[]
): TValue {
  return Service.active.useMemo(createValue, dependencies);
}
