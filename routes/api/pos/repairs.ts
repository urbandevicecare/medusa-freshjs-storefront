import { MedusaPOSService } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim() ||
    url.searchParams.get("token") || undefined;

  if (req.method === "GET") {
    const status = url.searchParams.get("status") || "all";
    const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
    const repairs = await service.getRepairs(token, status, q);
    return new Response(JSON.stringify({ repairs, count: repairs.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.action === "update_status") {
        if (!body.ticket_id || !body.status) {
          return new Response(
            JSON.stringify({ error: "Ticket ID and status are required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const ok = await service.updateRepairStatus(
          token,
          body.ticket_id,
          body.status,
          body.note,
        );
        return new Response(JSON.stringify({ success: ok }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (body.action === "add_note") {
        if (!body.ticket_id || !body.content) {
          return new Response(
            JSON.stringify({
              error: "Ticket ID and note content are required",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const ok = await service.addRepairNote(
          token,
          body.ticket_id,
          body.content,
          body.is_internal,
        );
        return new Response(JSON.stringify({ success: ok }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.customer_id) {
        return new Response(
          JSON.stringify({
            error: "Customer is required to book a workshop repair ticket",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (!body.model_name || !body.issue_description) {
        return new Response(
          JSON.stringify({
            error: "Device model name and issue description are required",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const repair = await service.createRepairIntake(token, body);
      return new Response(JSON.stringify({ repair, success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(
        JSON.stringify({
          error: e.message || "Failed to create repair ticket",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
