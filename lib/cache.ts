const kv = await Deno.openKv();

/**
 * Caches the result of an async function in Deno KV.
 * @param key The cache key array (e.g., ["medusa", "regions"])
 * @param fetcher The async function to fetch data if cache misses
 * @param ttlMs Time to live in milliseconds (default: 5 minutes)
 */
export async function withCache<T>(
  key: Deno.KvKey,
  fetcher: () => Promise<T>,
  ttlMs: number = 1000 * 60 * 5,
): Promise<T> {
  const cached = await kv.get<{ value: T; expiresAt: number }>(key);

  if (cached.value && cached.value.expiresAt > Date.now()) {
    return cached.value.value;
  }

  const data = await fetcher();

  // Fire and forget cache update, but only if we got valid data
  if (data !== null && data !== undefined) {
    kv.set(key, { value: data, expiresAt: Date.now() + ttlMs });
  }

  return data;
}
