export function queueMacrotask(effect?: () => void): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(() => {
      effect?.();
      resolve();
    }, 0)
  );
}
