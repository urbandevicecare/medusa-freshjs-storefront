import { MedusaPOSService } from "../../../services/medusa.ts";

const service = new MedusaPOSService();

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";

  const result = await service.resolveScan(code);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
