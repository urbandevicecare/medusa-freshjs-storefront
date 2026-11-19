import { MedusaPOSService } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.pin) {
        const session = await service.loginWithPin(body.pin);
        if (session) {
          return new Response(JSON.stringify(session), {
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (body.email && body.password) {
        const session = await service.loginAdmin(body.email, body.password);
        return new Response(JSON.stringify(session), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
      });
    }
  }

  // GET session check
  const pin = url.searchParams.get("pin") || "1234";
  const session = await service.loginWithPin(pin);
  return new Response(JSON.stringify(session), {
    headers: { "Content-Type": "application/json" },
  });
}
