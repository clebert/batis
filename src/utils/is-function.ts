export function isFunction<TFunction extends Function>(
  value: unknown
): value is TFunction {
  return typeof value === 'function';
}
