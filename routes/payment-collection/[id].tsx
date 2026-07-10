import { define } from "../../lib/utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const pcId = ctx.params.id;

    try {
      const backendUrl = Deno.env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
      const publishableKey = Deno.env.get("MEDUSA_PUBLISHABLE_KEY") || "";

      const res = await fetch(`${backendUrl}/store/payment-collections/${pcId}/order`, {
        headers: {
          "x-publishable-api-key": publishableKey,
        }
      });

      if (!res.ok) {
        throw new Error("Payment collection order not found");
      }

      const data = await res.json();
      
      if (data.success && data.hash && data.order_id) {
        // Redirect to our secure public payment page!
        return new Response("", {
          status: 302,
          headers: { Location: `/pay/${data.hash}/${data.order_id}` },
        });
      }
    } catch (err) {
      console.error("Error resolving payment collection link:", err);
    }

    // Fallback if failed
    return new Response("Invalid or expired payment link.", {
      status: 404,
    });
  },
});
