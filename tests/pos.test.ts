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
import { handler as posAuthHandler } from "../routes/api/pos/auth.ts";
import { handler as posRepairsHandler } from "../routes/api/pos/repairs.ts";

const service = new MedusaPOSService();

Deno.test("POS Service - Medusa Admin Authentication (Email & Password, No PIN)", async () => {
  const session = await service.loginAdmin(
    "nelly@urbandevicecare.co.uk",
    "password",
  );
  assertExists(session);
  assertExists(session.token);
  assertEquals(session.admin.first_name, "Nelly");
  assertEquals(session.admin.id, "usr_01KRV9NELLY");

  const verified = service.verifyAdminToken(session.token);
  assertExists(verified);
  assertEquals(verified?.id, "usr_01KRV9NELLY");
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
  const resp = await (posMiddlewareHandler as any)(fakeCtx);
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

Deno.test("POS API - /api/pos/customers endpoint with Bearer token", async () => {
  const req = new Request("http://localhost:8000/api/pos/customers?q=John", {
    headers: { Authorization: "Bearer token_staff_usr_01KRV9NELLY" },
  });
  const res = await posCustomersHandler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertExists(data.customers);
  assertEquals(Array.isArray(data.customers), true);
  assertEquals(data.customers.length >= 1, true);
});

Deno.test("POS API - /api/pos/checkout endpoint with custom item and default customer", async () => {
  const body = {
    terminal_channel: "web_counter_01",
    cashier: {
      id: "usr_01KRV9NELLY",
      name: "Nelly K.",
      email: "nelly@urbandevicecare.co.uk",
    },
    customer: {
      id: "usr_01KRV9NELLY",
      first_name: "Nelly",
      last_name: "K.",
      email: "nelly@urbandevicecare.co.uk",
      has_account: true,
    },
    items: [
      {
        variant_id: "custom_screen_protector",
        title: "Tempered Glass Protector",
        price: 1500,
        quantity: 1,
        total: 1500,
        is_custom: true,
      },
    ],
    subtotal: 1500,
    tax: 240,
    grand_total: 1740,
    tender: { type: "cash", tendered: 2000, change: 260 },
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
  assertEquals(data.order.grand_total, 1740);
  assertEquals(data.order.customer_id, "usr_01KRV9NELLY");
});

Deno.test("POS API - /api/pos/auth endpoint (Medusa Admin login)", async () => {
  const postReq = new Request("http://localhost:8000/api/pos/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nelly@urbandevicecare.co.uk",
      password: "password",
    }),
  });
  const postRes = await posAuthHandler(postReq);
  assertEquals(postRes.status, 200);
  const postData = await postRes.json();
  assertEquals(postData.admin.first_name, "Nelly");
  assertExists(postData.token);
});

Deno.test("POS API - /api/pos/repairs endpoint (Workshop Intake & List)", async () => {
  // 1. Initial list with zero dummy data
  const getReq = new Request(
    "http://localhost:8000/api/pos/repairs?status=all",
  );
  const getRes = await posRepairsHandler(getReq);
  assertEquals(getRes.status, 200);
  const getData = await getRes.json();
  assertExists(getData.repairs);
  assertEquals(Array.isArray(getData.repairs), true);

  // 2. POST repair intake
  const postReq = new Request("http://localhost:8000/api/pos/repairs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_id: "cus_01JOHN_DOE",
      customer_name: "John Doe",
      brand: "Apple",
      model_name: "MacBook Air M2",
      issue_description: "Spill damage diagnostics",
      total_estimate: 8000,
      deposit_amount: 2000,
    }),
  });
  const postRes = await posRepairsHandler(postReq);
  assertEquals(postRes.status, 201);
  const postData = await postRes.json();
  assertEquals(postData.success, true);
  assertEquals(postData.repair.balance_due, 6000);

  // 3. Status update
  const statusReq = new Request("http://localhost:8000/api/pos/repairs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_status",
      ticket_id: postData.repair.id,
      status: "diagnosing",
      note: "Inspection started",
    }),
  });
  const statusRes = await posRepairsHandler(statusReq);
  assertEquals(statusRes.status, 200);

  // 4. Verify in list
  const getReq2 = new Request(
    "http://localhost:8000/api/pos/repairs?status=all",
  );
  const getRes2 = await posRepairsHandler(getReq2);
  const getData2 = await getRes2.json();
  assertEquals(getData2.repairs.length >= 1, true);
});
