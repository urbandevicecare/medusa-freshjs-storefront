import { FreshContext } from "fresh";
import { getCategories } from "../lib/data.ts";
import { getCookies } from "jsr:@std/http@0.224.0/cookie";
import {
  isPaystackInstalled,
  isRepairModuleInstalled,
} from "../lib/features.ts";

export async function handler(ctx: FreshContext) {
  const cookies = getCookies(ctx.req.headers);
  ctx.state.isLoggedIn = !!cookies["_medusa_jwt"];

  try {
    const [categories, repairInstalled, paystackInstalled] = await Promise.all([
      getCategories(),
      isRepairModuleInstalled(),
      isPaystackInstalled(),
    ]);
    ctx.state.categories = categories;
    ctx.state.isRepairModuleInstalled = repairInstalled;
    ctx.state.isPaystackInstalled = paystackInstalled;
  } catch (_e) {
    ctx.state.categories = [];
    ctx.state.isRepairModuleInstalled = false;
    ctx.state.isPaystackInstalled = false;
  }
  return await ctx.next();
}
