import { medusa } from "./sdk.ts";
import { withCache } from "./cache.ts";

export async function getCategories() {
  return await withCache(
    ["medusa", "categories"],
    async () => {
      try {
        const { product_categories } = await medusa.store.category.list({
          limit: 100,
        });
        if (product_categories) {
          console.log(
            "Fetched categories from medusa:",
            product_categories.map((c: any) => ({
              id: c.id,
              handle: c.handle,
            })),
          );
          // Sort by rank, then take top 4
          return product_categories.sort((a: any, b: any) =>
            (a.rank || 0) - (b.rank || 0)
          );
        }
      } catch (e) {
        console.warn("Failed to fetch product categories", e);
      }
      return [];
    },
    1000 * 60 * 15, // 15 minutes cache
  );
}

export async function getStoreRegion() {
  return await withCache(
    ["medusa", "region"],
    async () => {
      try {
        const { regions } = await medusa.store.region.list();
        if (regions && regions.length > 0) {
          return regions[0];
        }
      } catch (_e) {
        console.warn("Failed to fetch regions");
      }
      return null;
    },
    1000 * 60 * 60, // 1 hour cache
  );
}

export async function getStoreCurrency() {
  const region = await getStoreRegion();
  return region?.currency_code || "USD";
}

export async function getProducts(
  collectionHandle?: string,
  headers?: Record<string, string>,
) {
  try {
    const region = await getStoreRegion();

    // Medusa v2 SDK usage
    const query: Record<string, string | string[]> = {};
    if (region?.id) {
      query.region_id = region.id;
    }

    if (collectionHandle) {
      // Fetch collection first to get its ID from cache
      const collections = await withCache(
        ["medusa", "collection", collectionHandle],
        async () => {
          const { collections } = await medusa.store.collection.list(
            { handle: collectionHandle },
            headers,
          );
          return collections;
        },
        1000 * 60 * 60, // 1 hour cache
      );

      if (collections && collections.length > 0) {
        query.collection_id = [collections[0].id];
      }
    }

    const { products } = await medusa.store.product.list(query, headers);

    if (products && products.length > 0) {
      return products;
    }
    return [];
  } catch (e) {
    console.error(
      `Failed to fetch data for ${collectionHandle || "products"}. Error:`,
      e,
    );
    throw e;
  }
}
