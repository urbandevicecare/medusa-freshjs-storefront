import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req, url } = resolveRequest(ctxOrReq);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() ||
      url.searchParams.get("token") || undefined;

    if (req.method === "GET") {
      const q = url.searchParams.get("q") || url.searchParams.get("query") ||
        "";
      const customers = await service.searchCustomers(q, token);
      return new Response(
        JSON.stringify({ customers, count: customers.length }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const customer = await service.createCustomer(body);
      return new Response(JSON.stringify({ customer, success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
