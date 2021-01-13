export function areDependenciesEqual(
  previousDependencies: readonly unknown[] | undefined,
  currentDependencies: readonly unknown[] | undefined
): boolean {
  if (!previousDependencies || !currentDependencies) {
    if (previousDependencies || currentDependencies) {
      throw new Error(
        'The existence of dependencies of a subagent must not change.'
      );
    }

    return false;
  }

  if (previousDependencies.length !== currentDependencies.length) {
    throw new Error(
      'The order and number of dependencies of a subagent must not change.'
    );
  }

  return previousDependencies.every((previousDependency, index) =>
    Object.is(previousDependency, currentDependencies[index])
  );
}
