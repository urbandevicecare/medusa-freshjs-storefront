import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { url } = resolveRequest(ctxOrReq);
    const code = url.searchParams.get("code") || "";

    const result = await service.resolveScan(code);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Failed to resolve barcode scan" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
