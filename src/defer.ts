export interface Deferred<TValue> {
  readonly promise: Promise<TValue>;

  resolve(value: TValue): void;
  reject(error: Error): void;
}

export function defer<TValue>(): Deferred<TValue> {
  let resolve: (value: TValue) => void;
  let reject: (error: Error) => void;

  const promise = new Promise<TValue>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {promise, resolve: resolve!, reject: reject!};
}
