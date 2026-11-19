import { MedusaPOSService } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const email = body.email || "";
      const password = body.password || "";

      if (!email || !password) {
        return new Response(
          JSON.stringify({
            error:
              "Email and password are required for Medusa admin authentication",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const session = await service.loginAdmin(email, password);
      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: e.message || "Authentication failed" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // GET: Session verification via Bearer token
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim() ||
    url.searchParams.get("token") || "";

  if (token) {
    const admin = service.verifyAdminToken(token);
    if (admin) {
      return new Response(
        JSON.stringify({ admin, token, authenticated: true }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "No active admin session", authenticated: false }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    },
  );
}
