export function isUnchanged(
  dependenciesA: readonly unknown[] | undefined,
  dependenciesB: readonly unknown[] | undefined,
): boolean {
  if (!dependenciesA || !dependenciesB) {
    if (dependenciesA || dependenciesB) {
      throw new Error(
        `The existence of dependencies of a Hook must not change.`,
      );
    }

    return false;
  }

  if (dependenciesA.length !== dependenciesB.length) {
    throw new Error(
      `The order and number of dependencies of a Hook must not change.`,
    );
  }

  return dependenciesA.every((dependencyA, index) =>
    Object.is(dependencyA, dependenciesB[index]),
  );
}
