import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req, url } = resolveRequest(ctxOrReq);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() ||
      url.searchParams.get("token") || undefined;

    const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const includeFallback = url.searchParams.get("fallback") === "true";

    const result = await service.getCatalog({
      q,
      limit,
      offset,
      authToken: token,
      includeFallback,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to fetch products catalog",
        products: [],
        count: 0,
        offset: 0,
        limit: 20,
        has_more: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
