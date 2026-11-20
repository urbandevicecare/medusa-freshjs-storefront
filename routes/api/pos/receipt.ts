import {
  ThermalPrinterService,
  type ThermalReceiptData,
} from "../../../services/thermal.ts";
import { resolveRequest } from "../../../services/medusa.ts";

export function handler(ctxOrReq: any): Response {
  const { url } = resolveRequest(ctxOrReq);
  const orderNumber = url.searchParams.get("order_number") || "POS-100234";
  const format = url.searchParams.get("format") || "escpos"; // "escpos" or "html"

  const sampleReceipt: ThermalReceiptData = {
    storeName: "Urban Device Care",
    storeAddress: "Shop 12, Tech Centre, Nairobi",
    storePhone: "+254 700 000 000",
    orderNumber,
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
    trackingUrl: `https://track.urbandevicecare.co.uk/order/${orderNumber}`,
  };

  if (format === "html") {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${orderNumber}</title>
  <style>
    body { font-family: monospace; width: 280px; margin: 20px auto; padding: 10px; border: 1px dashed #ccc; font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .flex { display: flex; justify-content: space-between; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  </style>
</head>
<body onload="window.print()">
  <div class="center bold" style="font-size: 16px;">${sampleReceipt.storeName}</div>
  <div class="center">${sampleReceipt.storeAddress}</div>
  <div class="center">Tel: ${sampleReceipt.storePhone}</div>
  <hr>
  <div class="center bold">ORDER: ${sampleReceipt.orderNumber}</div>
  <hr>
  <div class="flex bold"><span>ITEM</span><span>TOTAL</span></div>
  <hr>
  ${
      sampleReceipt.items
        .map((i) =>
          `<div class="flex"><span>${i.quantity}x ${i.title}</span><span>KES ${
            i.total.toFixed(2)
          }</span></div>`
        )
        .join("")
    }
  <hr>
  <div class="flex"><span>SUBTOTAL:</span><span>KES ${
      sampleReceipt.subtotal.toFixed(2)
    }</span></div>
  ${
      sampleReceipt.tax > 0
        ? `<div class="flex"><span>VAT (16%):</span><span>KES ${
          sampleReceipt.tax.toFixed(2)
        }</span></div>`
        : `<div class="flex"><span>VAT (0% / Exempt):</span><span>KES 0.00</span></div>`
    }
  <div class="flex bold" style="font-size: 14px;"><span>TOTAL:</span><span>KES ${
      sampleReceipt.grandTotal.toFixed(2)
    }</span></div>
  <hr>
  <div class="flex"><span>Cashier:</span><span>${sampleReceipt.cashierName}</span></div>
  <div class="flex"><span>Terminal:</span><span>${sampleReceipt.terminalChannel}</span></div>
  <hr>
  <div class="center">Thank you for visiting!</div>
</body>
</html>`;
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Return raw ESC/POS binary
  const binary = ThermalPrinterService.generateEscPos58mm(sampleReceipt);
  return new Response(binary as any, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        `attachment; filename="receipt_${orderNumber}.bin"`,
    },
  });
}
