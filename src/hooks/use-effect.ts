import {Effect, HookProcess} from '../hook-process';

export function useEffect(effect: Effect, dependencies?: unknown[]): void {
  HookProcess.getActive().registerEffectHook(effect, dependencies);
}
