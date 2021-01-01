import {Effect, HookService} from '../hook-service';

export function useEffect(effect: Effect, dependencies?: unknown[]): void {
  HookService.active.useEffect(effect, dependencies);
}
