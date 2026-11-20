import { MedusaPOSService, resolveRequest } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(ctxOrReq: any): Promise<Response> {
  try {
    const { req, url } = resolveRequest(ctxOrReq);

    if (req.method === "POST") {
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const email = (body?.email || "").trim();
      const password = (body?.password || "").trim();

      if (!email || !password) {
        return new Response(
          JSON.stringify({
            error:
              "Email and password are required for Medusa admin authentication",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      try {
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
      JSON.stringify({
        error: "No active admin session",
        authenticated: false,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
