import { define } from "../../lib/utils.ts";

export const handler = define.middleware(async (ctx) => {
  // Instruct storefront _app.tsx to suppress storefront header and footer
  ctx.state.hideLayout = true;
  ctx.state.title = "Urban Device Care • Web POS";
  ctx.state.description =
    "Point of Sale terminal for Urban Device Care workshop and retail counters.";
  return await ctx.next();
});
