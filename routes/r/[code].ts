import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const code = ctx.params.code;
    let backendUrl = Deno.env.get("MEDUSA_BACKEND_URL") ||
      "http://localhost:9000";
    backendUrl = backendUrl.replace(/\/$/, "");

    try {
      const res = await fetch(`${backendUrl}/api/store/repairs/r/${code}`, {
        redirect: "manual",
      });

      if (
        res.status === 302 || res.status === 301 || res.status === 307 ||
        res.status === 308
      ) {
        const location = res.headers.get("Location");
        if (location) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: location,
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch shortlink from backend", e);
    }

    return new Response("Link not found", { status: 404 });
  },
};
