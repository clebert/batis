export interface DiscriminableValue {
  readonly kind: string;
}

export function isKindOf<TValue extends DiscriminableValue>(
  kind: TValue['kind'],
  value: DiscriminableValue
): value is TValue {
  return value.kind === kind;
}
