/**
 * Process-local fallback when Upstash Redis is unavailable.
 *
 * The previous version looked bounded but was not:
 *
 *   if (store.size > 200) { delete entries where now >= expiresAt }
 *   store.set(key, ...)          ◀── ran unconditionally
 *
 * When all 200+ entries were still inside their TTL the sweep deleted nothing
 * and the set proceeded anyway, so the map grew without limit. The values here
 * are whole ChartPayload objects — planets, house cusps, every divisional chart,
 * the full Vimshottari dasha tree, the Lal Kitab report — so a Redis outage
 * under load became an out-of-memory crash with no obvious cause in the logs.
 *
 * Now: sweep expired first (cheap, and usually enough), then evict oldest-set
 * entries until under the cap. Insertion-ordered Map iteration gives us
 * first-in-first-out for free without tracking access times.
 *
 * FIFO rather than true LRU on purpose. A read-aware LRU would need memoryGet to
 * re-insert on every hit, which turns reads into writes for a fallback path that
 * should stay dumb. The entries share one TTL, so oldest-set is a good proxy for
 * least-useful.
 */
const MAX_ENTRIES = 200;

const store = new Map<string, { value: string; expiresAt: number }>();

/** Non-zero means Redis is down and this fallback is under real pressure. */
let pressureEvictions = 0;

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
  // Overwriting an existing key must not count toward growth.
  store.delete(key);

  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of Array.from(store.entries())) {
      if (now >= v.expiresAt) store.delete(k);
    }
  }

  // Still full after the sweep: everything is live, so evict oldest-first.
  // This is the branch the old code was missing entirely.
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
    pressureEvictions += 1;
    if (pressureEvictions === 1 || pressureEvictions % 100 === 0) {
      console.warn(
        `[astro-memory-cache] evicting live entries under pressure ` +
          `(${pressureEvictions} so far, cap ${MAX_ENTRIES}). This fallback ` +
          `only runs when Upstash Redis is unreachable — check redis health.`
      );
    }
  }

  store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

/** For /api/health and tests. */
export function memoryCacheStats(): {
  size: number;
  maxEntries: number;
  pressureEvictions: number;
} {
  return { size: store.size, maxEntries: MAX_ENTRIES, pressureEvictions };
}
