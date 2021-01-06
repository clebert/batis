export function queueMacrotasks(n: number): Promise<void> {
  const timeout = new Promise((resolve) => setTimeout(resolve, 0));

  return timeout.then(() => (n > 0 ? queueMacrotasks(n - 1) : undefined));
}
