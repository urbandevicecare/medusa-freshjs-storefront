import { assertEquals } from "jsr:@std/assert@1";
import { formatProviderName } from "../lib/utils.ts";

Deno.test("formatProviderName - standard string", () => {
  assertEquals(formatProviderName("stripe"), "Stripe");
});

Deno.test("formatProviderName - with underscores", () => {
  assertEquals(formatProviderName("bank_transfer"), "Bank Transfer");
});

Deno.test("formatProviderName - with pp_ prefix", () => {
  assertEquals(formatProviderName("pp_system_default"), "System Default");
});

Deno.test("formatProviderName - mixed separators", () => {
  assertEquals(
    formatProviderName("pp_manual-payment_method"),
    "Manual Payment Method",
  );
});
