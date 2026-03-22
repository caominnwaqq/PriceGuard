/** Cache in-memory TTL 5 phút — thay bằng Redis khi deploy. */
const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, { value: unknown; expires: number }>();

export function getCache<T>(key: string): T | null {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    store.delete(key);
    return null;
  }
  return row.value as T;
}

export function setCache(key: string, value: unknown): void {
  store.set(key, { value, expires: Date.now() + TTL_MS });
}
