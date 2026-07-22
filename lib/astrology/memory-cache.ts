/** Process-local fallback when Upstash Redis is unavailable. */
const store = new Map<string, { value: string; expiresAt: number }>();

export function memoryGet(key: string): string | null {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() >= row.expiresAt) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export function memorySet(key: string, value: string, ttlSec: number): void {
  if (store.size > 200) {
    const now = Date.now();
    Array.from(store.entries()).forEach(([k, v]) => {
      if (now >= v.expiresAt) store.delete(k);
    });
  }
  store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}
