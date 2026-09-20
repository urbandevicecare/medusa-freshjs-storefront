import { FreshContext } from "fresh";
import { isRepairModuleInstalled } from "../../lib/features.ts";

export async function handler(ctx: FreshContext) {
  const url = new URL(ctx.req.url);

  if (url.pathname === "/services/repairs") {
    const isInstalled = await isRepairModuleInstalled();
    if (!isInstalled) {
      return new Response("Not Found", { status: 404 });
    }
  }

  return await ctx.next();
}
