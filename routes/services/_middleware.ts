import { FreshContext } from "fresh";
import { isRepairModuleInstalled } from "../../lib/features.ts";

export async function handler(req: Request, ctx: FreshContext) {
  const url = new URL(req.url);

  if (url.pathname === "/services/repairs") {
    const isInstalled = await isRepairModuleInstalled();
    if (!isInstalled) {
      return new Response("Not Found", { status: 404 });
    }
  }

  return await ctx.next();
}
