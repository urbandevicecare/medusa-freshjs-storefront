import { FreshContext } from "fresh";
import { isRepairModuleInstalled } from "../../../lib/features.ts";

export async function handler(_req: Request, ctx: FreshContext) {
  const isInstalled = await isRepairModuleInstalled();
  if (!isInstalled) {
    return new Response(
      JSON.stringify({ error: "Repair module not installed" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return await ctx.next();
}
