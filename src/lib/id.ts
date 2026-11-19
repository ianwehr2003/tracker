/** Short unique id. Works over plain http too (crypto.randomUUID needs a secure context). */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
