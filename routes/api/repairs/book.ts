import { define } from "../../../lib/utils.ts";
import { getCookies } from "jsr:@std/http@0.224.0/cookie";

export const handler = define.handlers({
  POST: async (ctx) => {
    try {
      const cookies = getCookies(ctx.req.headers);
      const token = cookies["_medusa_jwt"];

      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await ctx.req.json();
      const backendUrl = Deno.env.get("MEDUSA_BACKEND_URL")!;
      const publishableKey = Deno.env.get("MEDUSA_PUBLISHABLE_KEY");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      
      if (publishableKey) {
        headers["x-publishable-api-key"] = publishableKey;
      }

      const response = await fetch(`${backendUrl}/store/repairs`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(errorText, {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      console.error("Book repair error:", e);
      return new Response(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Book repair failed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
