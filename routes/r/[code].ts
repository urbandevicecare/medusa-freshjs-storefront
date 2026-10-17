import { define } from "../../lib/utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const code = ctx.params?.code;
    if (!code || typeof code !== "string" || !code.trim()) {
      return new Response("Link not found or expired", { status: 404 });
    }

    const cleanCode = code.trim();
    let backendUrl = Deno.env.get("MEDUSA_BACKEND_URL") ||
      "http://localhost:9000";
    backendUrl = backendUrl.replace(/\/$/, "");

    // Fallback order:
    // 1. /r/:code (Universal redirect on Medusa backend)
    // 2. /api/store/repairs/r/:code
    // 3. /store/repairs/r/:code
    // 4. /api/store/documents/r/:code
    // 5. /store/documents/r/:code
    const endpoints = [
      `${backendUrl}/r/${encodeURIComponent(cleanCode)}`,
      `${backendUrl}/api/store/repairs/r/${encodeURIComponent(cleanCode)}`,
      `${backendUrl}/store/repairs/r/${encodeURIComponent(cleanCode)}`,
      `${backendUrl}/api/store/documents/r/${encodeURIComponent(cleanCode)}`,
      `${backendUrl}/store/documents/r/${encodeURIComponent(cleanCode)}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          redirect: "manual",
        });

        if (
          res.status === 302 || res.status === 301 || res.status === 307 ||
          res.status === 308
        ) {
          const location = res.headers.get("Location") ||
            res.headers.get("location");
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
        console.error(`Failed to resolve shortlink at ${endpoint}:`, e);
      }
    }

    return new Response("Link not found or expired", { status: 404 });
  },
});
