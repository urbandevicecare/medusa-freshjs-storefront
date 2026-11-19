import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { MedusaPOSService } from "../services/medusa.ts";
import {
  ThermalPrinterService,
  type ThermalReceiptData,
} from "../services/thermal.ts";
import { handler as posMiddlewareHandler } from "../routes/pos/_middleware.ts";
import { handler as posScanHandler } from "../routes/api/pos/scan.ts";
import { handler as posCheckoutHandler } from "../routes/api/pos/checkout.ts";
import { handler as posCustomersHandler } from "../routes/api/pos/customers.ts";

const service = new MedusaPOSService();

Deno.test("POS Service - Admin & PIN Authentication", async () => {
  const pinSession = await service.loginWithPin("1234");
  assertExists(pinSession);
  assertEquals(pinSession.admin.id, "usr_01KRV9NELLY");
});

Deno.test("POS Service - 1D Barcode & SKU Resolution", async () => {
  const res = await service.resolveScan("NP04011448");
  assertEquals(res.type, "part");
  assertExists(res.part);
  assertEquals(res.part.sku, "NP04011448");
});

Deno.test("POS Service - Thermal ESC/POS Byte Generation", () => {
  const receiptData: ThermalReceiptData = {
    storeName: "Urban Device Care",
    storeAddress: "Shop 12, Tech Centre, Nairobi",
    orderNumber: "POS-981240",
    cashierName: "Nelly K.",
    cashierId: "usr_01KRV9NELLY",
    terminalChannel: "web_counter_01",
    items: [
      {
        title: "MacBook Air M2 Keyboard",
        sku: "NP04011448",
        quantity: 1,
        unitPrice: 6500,
        total: 6500,
      },
    ],
    subtotal: 6500,
    tax: 1040,
    grandTotal: 7540,
    tenderType: "cash",
    tendered: 8000,
    change: 460,
    trackingUrl: "https://track.urbandevicecare.co.uk/order/POS-981240",
  };
  const bytes = ThermalPrinterService.generateEscPos58mm(receiptData);
  assertExists(bytes);
  assertEquals(bytes.length > 50, true);
  assertEquals(bytes[0], 0x1b);
  assertEquals(bytes[1], 0x40);
});

Deno.test("POS Route - Middleware sets hideLayout", async () => {
  const fakeCtx: any = {
    state: {},
    next: () => Promise.resolve(new Response("next-ok")),
  };
  const resp = await posMiddlewareHandler(fakeCtx);
  assertEquals(resp.status, 200);
  assertEquals(fakeCtx.state.hideLayout, true);
});

Deno.test("POS API - /api/pos/scan endpoint", async () => {
  const req = new Request("http://localhost:8000/api/pos/scan?code=NP04011448");
  const res = await posScanHandler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.type, "part");
  assertEquals(data.part.sku, "NP04011448");
});

Deno.test("POS API - /api/pos/customers endpoint", async () => {
  const req = new Request("http://localhost:8000/api/pos/customers?q=John");
  const res = await posCustomersHandler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertExists(data.customers);
  assertEquals(Array.isArray(data.customers), true);
});

Deno.test("POS API - /api/pos/checkout endpoint", async () => {
  const body = {
    terminal_channel: "web_counter_01",
    cashier: { id: "usr_01KRV9NELLY", name: "Nelly K." },
    items: [
      {
        variant_id: "var_kb_a2681",
        title: "MacBook Air Keyboard",
        price: 6500,
        quantity: 1,
        total: 6500,
      },
    ],
    subtotal: 6500,
    tax: 1040,
    grand_total: 7540,
    tender: { type: "cash", tendered: 8000, change: 460 },
  };
  const req = new Request("http://localhost:8000/api/pos/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await posCheckoutHandler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(data.order.grand_total, 7540);
});
