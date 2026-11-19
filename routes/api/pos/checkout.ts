import { MedusaPOSService } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = await req.json();
    const order = await service.createPosOrder(body);

    return new Response(JSON.stringify({ success: true, ...order, order }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
