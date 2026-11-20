import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req } = resolveRequest(ctxOrReq);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || undefined;

    const priceLists = await service.getPriceLists(token);
    return new Response(JSON.stringify({ price_lists: priceLists }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Failed to fetch price lists" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
