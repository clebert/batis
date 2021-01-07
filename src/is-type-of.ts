export interface DiscriminableValue {
  readonly type: string;
}

export function isTypeOf<TValue extends DiscriminableValue>(
  expectedType: TValue['type'],
  value: DiscriminableValue
): value is TValue {
  return value.type === expectedType;
}
