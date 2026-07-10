import { define } from "../../lib/utils.ts";
import { medusa } from "../../lib/sdk.ts";
import { getUserRating, submitRating } from "../../lib/ratings.ts";
import { getCookies } from "jsr:@std/http@0.224.0/cookie";

export const handler = define.handlers({
  async POST(ctx) {
    const cookies = getCookies(ctx.req.headers);
    const token = cookies["_medusa_jwt"];

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    try {
      // Verify token with Medusa to ensure the user is genuinely logged in
      const { customer } = await medusa.store.customer.retrieve(
        {},
        { Authorization: `Bearer ${token}` }
      );

      if (!customer || !customer.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      }

      const body = await ctx.req.json();
      const { productId, rating } = body;

      if (
        !productId || typeof rating !== "number" || rating < 1 || rating > 5
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid request payload" }),
          { status: 400 },
        );
      }

      const stats = await submitRating(productId, customer.id, rating);
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Error submitting rating:", err);
      return new Response(
        JSON.stringify({ error: "Failed to submit rating" }),
        { status: 500 },
      );
    }
  },

  // Expose a GET endpoint to fetch a specific user's rating for a single product
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const productId = url.searchParams.get("productId");
    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing productId" }), {
        status: 400,
      });
    }

    const cookies = getCookies(ctx.req.headers);
    const token = cookies["_medusa_jwt"];

    let userRating = null;

    if (token) {
      try {
        const { customer } = await medusa.store.customer.retrieve(
          {},
          { Authorization: `Bearer ${token}` }
        );
        if (customer && customer.id) {
          userRating = await getUserRating(productId, customer.id);
        }
      } catch (e) {
        // Ignore auth errors on GET, just means user isn't logged in or token expired
      }
    }

    return new Response(JSON.stringify({ userRating }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
