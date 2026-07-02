interface Entry<T> {
  value: T;
  expires: number;
}

/**
 * Minimal in-memory TTL cache. Used to avoid re-fetching weather for the same
 * location within a short window (see docs/PLAN.md §3, data layer).
 */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, Entry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expires) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
    clear(): void {
      store.clear();
    },
  };
}
