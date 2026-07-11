import { define } from "../../../lib/utils.ts";
import { medusa } from "../../../lib/sdk.ts";
import { getCookies } from "jsr:@std/http@0.224.0/cookie";

export const handler = define.handlers({
  POST: async (ctx) => {
    try {
      const cookies = getCookies(ctx.req.headers);
      const cartId = cookies["_medusa_cart_id"];
      const token = cookies["_medusa_jwt"];
      const body = await ctx.req.json();

      if (!cartId) {
        return new Response(JSON.stringify({ error: "Cart not found" }), {
          status: 404,
        });
      }

      const reqHeaders: Record<string, string> = {};
      if (token) {
        reqHeaders.Authorization = `Bearer ${token}`;
      }

      const { cart: existingCart } = await medusa.store.cart.retrieve(cartId, {
        fields: "*region",
      }, reqHeaders);

      // Update the cart address
      await medusa.store.cart.update(
        cartId,
        {
          shipping_address: body.shipping_address,
          region_id: existingCart.region_id,
        },
        {},
        reqHeaders,
      );

      // Fetch new shipping options
      const { shipping_options: rawOptions } = await medusa.store.fulfillment
        .listCartOptions({ cart_id: cartId }, reqHeaders);

      try {
        await Deno.writeTextFile(
          "/tmp/shipping_debug.log",
          `Cart Update Payload: ${
            JSON.stringify(body.shipping_address)
          }\nRaw Options: ${JSON.stringify(rawOptions)}\n\n`,
          { append: true },
        );
      } catch (e) {}

      // Relax the filter just in case amount is null for calculated options
      const shipping_options = rawOptions || [];

      return new Response(
        JSON.stringify({
          success: true,
          shipping_options,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (e: unknown) {
      console.error("Update address error:", e);
      return new Response(
        JSON.stringify({ error: "Failed to update address and fetch options" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
