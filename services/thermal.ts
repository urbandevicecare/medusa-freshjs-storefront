export interface ThermalReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  orderNumber: string;
  cashierName: string;
  cashierId: string;
  terminalChannel: string;
  items: Array<{
    title: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  grandTotal: number;
  tenderType: string;
  tendered: number;
  change: number;
  customerName?: string;
  customerPhone?: string;
  customerCompany?: string;
  trackingUrl?: string;
}

export class ThermalPrinterService {
  /**
   * Generates a 58mm (32 columns) ESC/POS binary Uint8Array
   */
  static generateEscPos58mm(data: ThermalReceiptData): Uint8Array {
    const bytes: number[] = [];

    // ESC @ - Initialize printer
    bytes.push(0x1b, 0x40);

    // ESC t 0 - Character code table: PC437
    bytes.push(0x1b, 0x74, 0x00);

    // Center alignment
    bytes.push(0x1b, 0x61, 0x01);

    // Bold ON & Double Height
    bytes.push(0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11);
    this.appendString(bytes, `${data.storeName}\n`);

    // Reset text mode
    bytes.push(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00);
    this.appendString(bytes, "Web POS • Fresh.js (Deno)\n");
    if (data.storeAddress) this.appendString(bytes, `${data.storeAddress}\n`);
    if (data.storePhone) this.appendString(bytes, `Tel: ${data.storePhone}\n`);
    this.appendString(bytes, "--------------------------------\n");

    // 1D Barcode: Code 128 of order/ticket number
    const cleanOrder = (data.orderNumber || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanOrder) {
      bytes.push(0x1d, 0x77, 0x02); // Module width 2
      bytes.push(0x1d, 0x68, 0x32); // Height 50 dots
      bytes.push(0x1d, 0x48, 0x02); // HRI below
      bytes.push(0x1d, 0x66, 0x00); // Font A

      const encoder = new TextEncoder();
      const codeBytes = encoder.encode(cleanOrder);
      bytes.push(0x1d, 0x6b, 0x49); // GS k 73 (Code 128)
      bytes.push(codeBytes.length + 2); // Length
      bytes.push(0x7b, 0x42); // Code Set B
      for (const b of codeBytes) bytes.push(b);
      bytes.push(0x0a);
    }

    // Left alignment for items
    bytes.push(0x1b, 0x61, 0x00);
    this.appendString(bytes, "--------------------------------\n");
    this.appendString(
      bytes,
      this.formatTwoColumns("ITEM / QTY", "TOTAL", 32) + "\n",
    );
    this.appendString(bytes, "--------------------------------\n");

    for (const item of data.items) {
      const title = item.title.length > 20
        ? item.title.slice(0, 20)
        : item.title;
      const line = this.formatTwoColumns(
        `${item.quantity}x ${title}`,
        item.total.toFixed(2),
        32,
      );
      this.appendString(bytes, line + "\n");
      if (item.sku) {
        this.appendString(bytes, `   SKU: ${item.sku}\n`);
      }
    }

    this.appendString(bytes, "--------------------------------\n");
    this.appendString(
      bytes,
      this.formatTwoColumns(
        "SUBTOTAL:",
        `KES ${data.subtotal.toFixed(2)}`,
        32,
      ) + "\n",
    );
    if (data.tax > 0) {
      this.appendString(
        bytes,
        this.formatTwoColumns("VAT (16%):", `KES ${data.tax.toFixed(2)}`, 32) +
          "\n",
      );
    } else {
      this.appendString(
        bytes,
        this.formatTwoColumns("VAT (0%):", "KES 0.00", 32) + "\n",
      );
    }

    // Bold Grand Total
    bytes.push(0x1b, 0x45, 0x01);
    this.appendString(
      bytes,
      this.formatTwoColumns("TOTAL:", `KES ${data.grandTotal.toFixed(2)}`, 32) +
        "\n",
    );
    bytes.push(0x1b, 0x45, 0x00);

    this.appendString(bytes, "--------------------------------\n");
    this.appendString(
      bytes,
      this.formatTwoColumns("Tender:", data.tenderType.toUpperCase(), 32) +
        "\n",
    );
    this.appendString(
      bytes,
      this.formatTwoColumns(
        "Tendered:",
        `KES ${data.tendered.toFixed(2)}`,
        32,
      ) + "\n",
    );
    this.appendString(
      bytes,
      this.formatTwoColumns(
        "Change Due:",
        `KES ${data.change.toFixed(2)}`,
        32,
      ) + "\n",
    );
    this.appendString(bytes, "--------------------------------\n");

    // Cashier & Terminal attribution
    this.appendString(
      bytes,
      `Cashier: ${data.cashierName} (${data.cashierId})\n`,
    );
    this.appendString(bytes, `Terminal: ${data.terminalChannel}\n`);
    if (data.customerName) {
      this.appendString(
        bytes,
        `Client: ${data.customerName}${
          data.customerCompany ? ` (${data.customerCompany})` : ""
        }\n`,
      );
      if (data.customerPhone) {
        this.appendString(bytes, `Phone: ${data.customerPhone}\n`);
      }
    }

    // QR Code (GS ( k) if tracking URL present
    if (data.trackingUrl) {
      bytes.push(0x1b, 0x61, 0x01); // Center
      this.appendString(bytes, "\nScan to track / pay:\n");

      const encoder = new TextEncoder();
      const urlBytes = encoder.encode(data.trackingUrl);
      const len = urlBytes.length + 3;
      const pL = len & 0xff;
      const pH = (len >> 8) & 0xff;

      // Model 2
      bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
      // Module size 4
      bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04);
      // Error correction level M
      bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
      // Store QR
      bytes.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
      for (const b of urlBytes) bytes.push(b);
      // Print QR
      bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    }

    // Feed 4 lines & paper cut (GS V 66 0)
    bytes.push(0x1b, 0x64, 0x04, 0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  }

  /**
   * Generates a 58mm HTML preview receipt
   */
  static generateHtml58mm(data: ThermalReceiptData): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${data.orderNumber}</title>
  <style>
    body { font-family: monospace; width: 280px; margin: 20px auto; padding: 10px; border: 1px dashed #ccc; font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .flex { display: flex; justify-content: space-between; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  </style>
</head>
<body onload="window.print()">
  <div class="center bold" style="font-size: 16px;">${data.storeName.toUpperCase()}</div>
  ${data.storeAddress ? `<div class="center">${data.storeAddress}</div>` : ""}
  ${data.storePhone ? `<div class="center">Tel: ${data.storePhone}</div>` : ""}
  <div class="center" style="font-size: 10px; color: #666;">58mm Thermal Receipt</div>
  <hr>
  <div class="center bold">ORDER: ${data.orderNumber}</div>
  <hr>
  <div class="flex bold"><span>ITEM</span><span>TOTAL</span></div>
  <hr>
  ${
      data.items
        .map((i) =>
          `<div class="flex"><span>${i.quantity}x ${i.title}</span><span>KES ${
            i.total.toFixed(2)
          }</span></div>`
        )
        .join("")
    }
  <hr>
  <div class="flex"><span>SUBTOTAL:</span><span>KES ${
      data.subtotal.toFixed(2)
    }</span></div>
  ${
      data.tax > 0
        ? `<div class="flex"><span>VAT (16%):</span><span>KES ${
          data.tax.toFixed(2)
        }</span></div>`
        : `<div class="flex"><span>VAT (0% / Exempt):</span><span>KES 0.00</span></div>`
    }
  <div class="flex bold" style="font-size: 14px;"><span>TOTAL:</span><span>KES ${
      data.grandTotal.toFixed(2)
    }</span></div>
  <hr>
  <div class="flex"><span>Tender:</span><span>${data.tenderType.toUpperCase()}</span></div>
  <div class="flex"><span>Tendered:</span><span>KES ${
      data.tendered.toFixed(2)
    }</span></div>
  <div class="flex"><span>Change:</span><span>KES ${
      data.change.toFixed(2)
    }</span></div>
  <hr>
  <div class="flex"><span>Cashier:</span><span>${data.cashierName}</span></div>
  <div class="flex"><span>Terminal:</span><span>${data.terminalChannel}</span></div>
  ${
      data.customerName
        ? `<div class="flex"><span>Client:</span><span>${data.customerName}</span></div>`
        : ""
    }
  <hr>
  <div class="center">Thank you for visiting!</div>
</body>
</html>`;
  }

  private static appendString(bytes: number[], str: string) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    for (const b of encoded) bytes.push(b);
  }

  private static formatTwoColumns(
    left: string,
    right: string,
    width: number,
  ): string {
    const maxLeft = width - right.length - 1;
    const safeLeft = maxLeft > 0 && left.length > maxLeft
      ? left.slice(0, maxLeft)
      : left;
    const spaces = " ".repeat(
      Math.max(1, width - safeLeft.length - right.length),
    );
    return `${safeLeft}${spaces}${right}`;
  }
}
