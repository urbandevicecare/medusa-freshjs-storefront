import { assertEquals } from "jsr:@std/assert@1";
import { withCache } from "../lib/cache.ts";

Deno.test("withCache - executes fetcher on first call", async () => {
  let callCount = 0;
  const mockFetcher = () => {
    callCount++;
    return Promise.resolve({ data: "test" });
  };

  const result = await withCache(["test", "key1"], mockFetcher);
  assertEquals(result.data, "test");
  assertEquals(callCount, 1);
});

Deno.test("withCache - returns cached value on second call", async () => {
  let callCount = 0;
  const mockFetcher = () => {
    callCount++;
    return Promise.resolve({ data: "cached_test" });
  };

  // First call populates cache
  await withCache(["test", "key2"], mockFetcher);

  // Wait slightly to ensure KV is updated (KV writes are fast but good practice)
  await new Promise((r) => setTimeout(r, 50));

  // Second call should hit cache
  const result2 = await withCache(["test", "key2"], mockFetcher);

  assertEquals(result2.data, "cached_test");
  // Call count should still be 1!
  assertEquals(callCount, 1);
});

Deno.test("withCache - expires cache correctly", async () => {
  let callCount = 0;
  const mockFetcher = () => {
    callCount++;
    return Promise.resolve({ data: "expire_test" });
  };

  // Cache with 10ms TTL
  await withCache(["test", "key3"], mockFetcher, 10);

  // Wait for TTL to expire
  await new Promise((r) => setTimeout(r, 50));

  // Second call should trigger fetcher again
  await withCache(["test", "key3"], mockFetcher, 10);

  assertEquals(callCount, 2);
});
