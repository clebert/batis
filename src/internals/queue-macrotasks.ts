import {defer} from './defer';

export function queueMacrotasks(n: number): Promise<void> {
  const macrotask = defer<void>();

  setTimeout(() => macrotask.resolve(), 0);

  return macrotask.promise.then(() =>
    n > 0 ? queueMacrotasks(n - 1) : undefined
  );
}
