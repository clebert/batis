import {HookService} from '../hook-service';

export function useMemo<TValue>(
  createValue: () => TValue,
  dependencies: readonly unknown[]
): TValue {
  return HookService.active.useMemo(createValue, dependencies);
}
