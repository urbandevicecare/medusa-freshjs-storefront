export interface RatingStats {
  totalStars: number;
  count: number;
  average: number;
}

let kvInstance: Deno.Kv | undefined;

async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    // Separate file for ratings DB during local dev to isolate from news views
    kvInstance = await Deno.openKv(
      Deno.env.get("DENO_DEPLOYMENT_ID") ? undefined : "./ratings.db",
    );
  }
  return kvInstance;
}

export async function getProductRatings(
  productIds: string[],
): Promise<Record<string, RatingStats>> {
  const kv = await getKv();
  const results: Record<string, RatingStats> = {};

  if (productIds.length === 0) return results;

  const keys = productIds.map((id) => ["product_ratings", id]);

  // Deno KV getMany supports up to 10 keys per request.
  for (let i = 0; i < keys.length; i += 10) {
    const chunk = keys.slice(i, i + 10);
    const res = await kv.getMany<{ totalStars: number; count: number }[]>(
      chunk,
    );

    res.forEach((entry, idx) => {
      const productId = chunk[idx][1] as string;
      const data = entry.value || { totalStars: 0, count: 0 };
      results[productId] = {
        totalStars: data.totalStars,
        count: data.count,
        average: data.count > 0
          ? Number((data.totalStars / data.count).toFixed(1))
          : 0,
      };
    });
  }

  return results;
}

export async function submitRating(
  productId: string,
  userId: string,
  rating: number,
): Promise<RatingStats> {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const kv = await getKv();
  const statsKey = ["product_ratings", productId];
  const userKey = ["product_user_ratings", productId, userId];

  let res = { ok: false };
  let finalStats = { totalStars: 0, count: 0, average: 0 };

  // Loop until atomic commit is successful
  while (!res.ok) {
    const [statsRes, userRes] = await kv.getMany([statsKey, userKey]);

    const currentStats =
      (statsRes.value as { totalStars: number; count: number }) ||
      { totalStars: 0, count: 0 };
    const previousRating = userRes.value as number | null;

    let newTotal = currentStats.totalStars;
    let newCount = currentStats.count;

    if (previousRating) {
      newTotal = newTotal - previousRating + rating;
    } else {
      newTotal += rating;
      newCount += 1;
    }

    const nextStats = { totalStars: newTotal, count: newCount };

    res = await kv.atomic()
      .check(statsRes)
      .check(userRes)
      .set(statsKey, nextStats)
      .set(userKey, rating)
      .commit();

    if (res.ok) {
      finalStats = {
        totalStars: nextStats.totalStars,
        count: nextStats.count,
        average: nextStats.count > 0
          ? Number((nextStats.totalStars / nextStats.count).toFixed(1))
          : 0,
      };
    }
  }

  return finalStats;
}

export async function getUserRating(
  productId: string,
  userId: string,
): Promise<number | null> {
  const kv = await getKv();
  const res = await kv.get<number>(["product_user_ratings", productId, userId]);
  return res.value;
}
