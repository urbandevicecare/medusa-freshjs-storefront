import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req, url } = resolveRequest(ctxOrReq);
    let reference = url.searchParams.get("reference") || "";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.reference) reference = body.reference;
    }

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Transaction reference is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await service.verifyStkPayment(reference);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Failed to verify transaction" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
