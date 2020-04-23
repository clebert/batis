export function areHookInputsEqual(
  previousDependencies: unknown[] | undefined,
  currentDependencies: unknown[] | undefined
): boolean {
  if (!previousDependencies || !currentDependencies) {
    if (previousDependencies || currentDependencies) {
      throw new Error('The existence of hook dependencies must not change.');
    }

    return false;
  }

  if (previousDependencies.length !== currentDependencies.length) {
    throw new Error(
      'The order and number of hook dependencies must not change.'
    );
  }

  return previousDependencies.every((previousDependency, index) =>
    Object.is(previousDependency, currentDependencies[index])
  );
}
