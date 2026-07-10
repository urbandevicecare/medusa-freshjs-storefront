import { define } from "../../../../../lib/utils.ts";
import { medusa } from "../../../../../lib/sdk.ts";

export const handler = define.handlers({
  POST: async (ctx) => {
    try {
      const orderId = ctx.params.id;
      const body = await ctx.req.json();

      const providerId = body.payment_method;
      if (!providerId) {
        return new Response(
          JSON.stringify({ error: "payment_method is required" }),
          { status: 400 },
        );
      }

      // 1. Fetch order publicly
      const { order } = await medusa.store.order.retrieve(
        orderId,
        {
          fields: "*payment_collections,*payment_collections.payment_sessions",
        }
      );

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
        });
      }

      const paymentCollectionId = order.payment_collections?.[0]?.id;

      if (!paymentCollectionId) {
        return new Response(
          JSON.stringify({
            error: "No payment collection found on this order",
          }),
          { status: 400 },
        );
      }

      const publishableKey = Deno.env.get("MEDUSA_PUBLISHABLE_KEY") || "";
      // 3. Initiate a payment session publicly
      const response = await medusa.client.request(
        "POST",
        `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
        {
          payload: {
            provider_id: providerId,
            data: {
              order_id: orderId,
            },
          },
          headers: {
            "x-publishable-api-key": publishableKey,
          }
        },
      );

      const payment_collection = response.payment_collection;

      const paymentSession = payment_collection?.payment_sessions?.find(
        (s: any) => s.provider_id === providerId,
      );

      return new Response(
        JSON.stringify({
          success: true,
          paymentSession: paymentSession?.data || {},
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (e: unknown) {
      console.error("Public order payment session error:", e);
      const errMsg =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (e as { message?: string })?.message ||
        "Failed to initialize order payment session";
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
