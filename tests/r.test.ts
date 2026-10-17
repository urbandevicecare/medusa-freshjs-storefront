import { assertEquals } from "jsr:@std/assert@1";
import { handler } from "../routes/r/[code].ts";

Deno.test("Shortlink handler - returns 404 for empty code", async () => {
  const req = new Request("https://urbandevicecare.co.uk/r/");
  const ctx: any = {
    req,
    params: { code: "" },
  };

  const response = await (handler as any).GET(ctx);
  assertEquals(response.status, 404);
});

Deno.test("Shortlink handler - safely handles non-existent code without 500", async () => {
  const req = new Request(
    "https://urbandevicecare.co.uk/r/definitely-not-found-xyz-999",
  );
  const ctx: any = {
    req,
    params: { code: "definitely-not-found-xyz-999" },
  };

  const response = await (handler as any).GET(ctx);
  assertEquals(response.status, 404);
});
