export function macrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}
