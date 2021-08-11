export interface Deferred<TValue> {
  readonly promise: Promise<TValue>;

  resolve(value: TValue): void;
}

export function defer<TValue>(): Deferred<TValue> {
  let resolve: (value: TValue) => void;

  const promise = new Promise<TValue>((_resolve) => {
    resolve = _resolve;
  });

  return {promise, resolve: resolve!};
}
