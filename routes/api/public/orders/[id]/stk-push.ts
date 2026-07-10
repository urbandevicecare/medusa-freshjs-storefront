import { define } from "../../../../../lib/utils.ts";

export const handler = define.handlers({
  POST: async (ctx) => {
    try {
      const orderId = ctx.params.id;
      const body = await ctx.req.json();
      const { phone, amount } = body;

      if (!phone) {
        return new Response(JSON.stringify({ error: "Phone number is required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Forward request to Medusa backend publicly
      const backendUrl = Deno.env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
      const publishableKey = Deno.env.get("MEDUSA_PUBLISHABLE_KEY") || "";
      const res = await fetch(`${backendUrl}/store/paystack/stk-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify({
          order_id: orderId,
          phone,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.message || "Failed to initiate STK Push." }), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      console.error("Public STK Push error:", e);
      return new Response(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Failed to initiate STK Push.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
