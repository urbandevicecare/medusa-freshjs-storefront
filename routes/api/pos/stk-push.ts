import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req } = resolveRequest(ctxOrReq);
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || undefined;

    const body = await req.json();
    const { phone, amount, ticket_id, order_id } = body;

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Phone number and amount are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await service.initiateStkPush({
      phone,
      amount: Number(amount),
      ticket_id,
      order_id,
      authToken: token,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Failed to initiate STK push" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
