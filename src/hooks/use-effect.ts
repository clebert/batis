import {Effect, Service} from '../service';

export function useEffect(effect: Effect, dependencies?: unknown[]): void {
  Service.active.useEffect(effect, dependencies);
}
