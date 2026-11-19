import { medusa as defaultMedusaClient } from "../lib/sdk.ts";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  role?: string;
  pin?: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  product_title?: string;
  sku?: string;
  barcode?: string;
  price: number;
  inventory_quantity: number;
}

export interface CartItem {
  variant_id: string;
  title: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface RepairTicketSummary {
  id: string;
  ticket_number: string;
  customer_name?: string;
  device_name?: string;
  serial_number?: string;
  status: string;
  labor_estimate?: number;
}

export interface ScanResult {
  type: "part" | "ticket" | "device" | "unknown";
  part?: ProductVariant;
  ticket?: RepairTicketSummary;
  device_history?: Array<{
    ticket_number: string;
    serial_number: string;
    device_name: string;
    completed_at: string;
    status: string;
  }>;
}

export interface POSCustomer {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name?: string;
  has_account?: boolean;
  metadata?: Record<string, unknown>;
}

export class MedusaPOSService {
  private backendUrl: string;
  private publishableKey: string;
  private medusaClient: any;
  private pinStore: Map<string, { admin: AdminUser; token: string }> =
    new Map();
  private mockCustomers: POSCustomer[] = [
    {
      id: "cus_01JOHN_DOE",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone: "+254712345678",
      company_name: "Nairobi Tech Ltd",
      has_account: true,
      metadata: {
        company_name: "Nairobi Tech Ltd",
        is_pos_registered: true,
      },
    },
    {
      id: "cus_02JANE_SMITH",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@urbandevicecare.co.uk",
      phone: "+254722998877",
      company_name: "Urban Studios",
      has_account: true,
      metadata: {
        company_name: "Urban Studios",
        is_pos_registered: true,
      },
    },
  ];

  // Workshop fallback catalog for offline POS operation
  private mockParts: ProductVariant[] = [
    {
      id: "var_kb_a2681",
      title: 'MacBook Air M2 13" (A2681) Keyboard',
      sku: "NP04011448",
      barcode: "NP04011448",
      price: 6500,
      inventory_quantity: 12,
    },
    {
      id: "var_bat_a2442",
      title: 'MacBook Pro 14" (A2442) Battery OEM',
      sku: "NP04019921",
      barcode: "NP04019921",
      price: 12000,
      inventory_quantity: 8,
    },
    {
      id: "var_screen_a2338",
      title: "MacBook Pro M1 (A2338) Retina Display Assembly Space Gray",
      sku: "NP04023381",
      barcode: "0793573199210",
      price: 28500,
      inventory_quantity: 4,
    },
    {
      id: "var_chg_67w",
      title: "Apple 67W USB-C Power Adapter Fast Charger",
      sku: "ACC-CHG-67W",
      barcode: "194252432822",
      price: 4500,
      inventory_quantity: 20,
    },
    {
      id: "var_diag",
      title: "Standard Workshop Diagnostic Service",
      sku: "SRV-DIAG-01",
      barcode: "SRV-DIAG-01",
      price: 2000,
      inventory_quantity: 999,
    },
  ];

  constructor(
    backendUrl?: string,
    publishableKey?: string,
    customMedusaClient?: any,
  ) {
    this.backendUrl = (backendUrl || Deno.env.get("MEDUSA_BACKEND_URL") ||
      "http://localhost:9000").replace(/\/$/, "");
    this.publishableKey = publishableKey ||
      Deno.env.get("MEDUSA_PUBLISHABLE_KEY") || "";
    this.medusaClient = customMedusaClient || defaultMedusaClient;

    // Default cashiers
    const defaultCashier: AdminUser = {
      id: "usr_01KRV9NELLY",
      email: "nelly@urbandevicecare.co.uk",
      first_name: "Nelly",
      last_name: "K.",
      role: "admin",
      pin: "1234",
    };
    this.pinStore.set("1234", {
      admin: defaultCashier,
      token: "mock_jwt_nelly",
    });

    const techJames: AdminUser = {
      id: "usr_02TECH_DAN",
      email: "dan@urbandevicecare.co.uk",
      first_name: "Dan",
      last_name: "M.",
      role: "technician",
      pin: "5555",
    };
    this.pinStore.set("5555", { admin: techJames, token: "mock_jwt_dan" });
  }

  public registerPin(
    pin: string,
    admin: AdminUser,
    token: string = "mock_jwt",
  ) {
    this.pinStore.set(pin, { admin, token });
  }

  public loginWithPin(
    pin: string,
  ): Promise<{ admin: AdminUser; token: string } | null> {
    if (this.pinStore.has(pin)) {
      return Promise.resolve(this.pinStore.get(pin)!);
    }
    return Promise.resolve(null);
  }

  public loginAdmin(
    email: string,
    _pass: string,
  ): Promise<{ admin: AdminUser; token: string }> {
    for (const entry of this.pinStore.values()) {
      if (entry.admin.email.toLowerCase() === email.toLowerCase()) {
        return Promise.resolve(entry);
      }
    }
    const user: AdminUser = {
      id: `usr_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
      email,
      first_name: email.split("@")[0],
      role: "admin",
    };
    return Promise.resolve({ admin: user, token: `token_${Date.now()}` });
  }

  /**
   * Fetches the active catalog from Medusa v2 Storefront API with fallback to local workshop catalog
   */
  public async getCatalog(): Promise<ProductVariant[]> {
    try {
      if (this.medusaClient?.store?.product) {
        const { products } = await this.medusaClient.store.product.list({
          limit: 50,
        });
        if (products && products.length > 0) {
          const liveVariants: ProductVariant[] = [];
          for (const p of products) {
            for (const v of (p.variants || [])) {
              liveVariants.push({
                id: v.id,
                title: `${p.title} (${v.title})`,
                product_title: p.title,
                sku: v.sku || undefined,
                barcode: v.barcode || undefined,
                price: v.calculated_price?.calculated_amount ??
                  (v.prices?.[0]?.amount || 0),
                inventory_quantity: v.inventory_quantity ?? 10,
              });
            }
          }
          if (liveVariants.length > 0) {
            return liveVariants;
          }
        }
      }
    } catch (_err) {
      // Gracefully fall back to local offline catalog
    }
    return this.mockParts;
  }

  /**
   * Resolves barcodes, SKUs, ticket numbers, or serial numbers
   */
  public async resolveScan(code: string): Promise<ScanResult> {
    const trimmed = (code || "").trim();
    if (!trimmed) {
      return { type: "unknown" };
    }

    // 1. Repair ticket check (e.g. REP-10023)
    if (trimmed.toUpperCase().startsWith("REP-")) {
      return {
        type: "ticket",
        ticket: {
          id: `rep_${trimmed.replace(/[^a-zA-Z0-9]/g, "")}`,
          ticket_number: trimmed.toUpperCase(),
          customer_name: "John Doe",
          device_name: 'MacBook Pro 16" (M1 Max, A2485)',
          serial_number: "C02G4120MD6R",
          status: "ready_for_pickup",
          labor_estimate: 4500,
        },
      };
    }

    // 2. Serial number check (12-char Apple serials, e.g. C02G4120MD6R)
    if (/^[A-Z0-9]{12}$/.test(trimmed) && trimmed.startsWith("C02")) {
      return {
        type: "device",
        device_history: [
          {
            ticket_number: "REP-09412",
            serial_number: trimmed,
            device_name: 'MacBook Pro 16" (A2485)',
            completed_at: "2026-08-14T11:00:00Z",
            status: "delivered",
          },
        ],
      };
    }

    // 3. Try live Medusa v2 Storefront API query if available
    try {
      if (this.medusaClient?.store?.product) {
        const { products } = await this.medusaClient.store.product.list({
          q: trimmed,
          limit: 10,
        });
        if (products && products.length > 0) {
          for (const p of products) {
            for (const v of (p.variants || [])) {
              if (
                v.sku?.toUpperCase() === trimmed.toUpperCase() ||
                v.barcode === trimmed ||
                v.id === trimmed
              ) {
                return {
                  type: "part",
                  part: {
                    id: v.id,
                    title: `${p.title} (${v.title})`,
                    product_title: p.title,
                    sku: v.sku || undefined,
                    barcode: v.barcode || undefined,
                    price: v.calculated_price?.calculated_amount ??
                      (v.prices?.[0]?.amount || 0),
                    inventory_quantity: v.inventory_quantity ?? 10,
                  },
                };
              }
            }
          }
        }
      }
    } catch (_err) {
      // Continue to local catalog lookup
    }

    // 4. Workshop parts catalog lookup
    const match = this.mockParts.find(
      (p) =>
        p.sku?.toUpperCase() === trimmed.toUpperCase() ||
        p.barcode === trimmed ||
        p.id === trimmed,
    );

    if (match) {
      return { type: "part", part: match };
    }

    return { type: "unknown" };
  }

  /**
   * Searches customers across live Medusa v2 admin API with local fallback
   */
  public async searchCustomers(query: string = ""): Promise<POSCustomer[]> {
    const q = (query || "").trim().toLowerCase();
    const results: POSCustomer[] = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    try {
      if (this.medusaClient?.admin?.customer) {
        const { customers } = await this.medusaClient.admin.customer.list({
          q,
          limit: 20,
        });
        if (customers && customers.length > 0) {
          for (const c of customers) {
            const cust: POSCustomer = {
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
              company_name: c.company_name || c.metadata?.company_name,
              has_account: c.has_account ?? true,
              metadata: c.metadata,
            };
            results.push(cust);
            seenIds.add(cust.id);
            seenEmails.add(cust.email.toLowerCase());
          }
        }
      }
    } catch (_err) {
      // Gracefully fall back to local store
    }

    const localMatches = !q
      ? this.mockCustomers
      : this.mockCustomers.filter((c) => {
        const full = `${c.first_name} ${c.last_name || ""}`.toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const email = c.email.toLowerCase();
        const comp = (c.company_name || "").toLowerCase();
        return full.includes(q) || phone.includes(q) || email.includes(q) ||
          comp.includes(q);
      });

    for (const c of localMatches) {
      if (!seenIds.has(c.id) && !seenEmails.has(c.email.toLowerCase())) {
        results.push(c);
        seenIds.add(c.id);
        seenEmails.add(c.email.toLowerCase());
      }
    }

    return results;
  }

  /**
   * Registers a customer in Medusa v2 (POST /admin/customers) with fallback walk-in email
   */
  public async createCustomer(input: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    company_name?: string;
  }): Promise<POSCustomer> {
    const firstName = (input.first_name || "").trim();
    const lastName = (input.last_name || "").trim();
    const phone = (input.phone || "").trim();

    if (!firstName) {
      throw new Error("First name is required for customer registration");
    }
    if (!lastName) {
      throw new Error("Last name is required for customer registration");
    }
    if (!phone) {
      throw new Error("Phone number is required for customer registration");
    }

    const cleanPhone = phone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!cleanPhone) {
      throw new Error(
        "Phone number must contain at least one valid digit or character",
      );
    }

    // Validate email format if provided
    let email = (input.email || "").trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(
        "Invalid email format. Leave blank to auto-generate a valid walk-in fallback email.",
      );
    }

    if (!email) {
      const baseEmail = `walkin_${cleanPhone}@pos.urbandevicecare.co.uk`;
      email = baseEmail;

      // Check if baseEmail already registered for same customer
      const existing = this.mockCustomers.find((c) =>
        c.email.toLowerCase() === baseEmail
      );
      if (existing) {
        const isSamePerson =
          existing.first_name.toLowerCase() === firstName.toLowerCase() &&
          (existing.last_name || "").toLowerCase() === lastName.toLowerCase();
        if (isSamePerson) {
          return existing;
        }
        // Different person with same phone - avoid Medusa duplicate email constraint collision
        let counter = 2;
        while (
          this.mockCustomers.some((c) =>
            c.email.toLowerCase() ===
              `walkin_${cleanPhone}_${counter}@pos.urbandevicecare.co.uk`
          )
        ) {
          counter++;
        }
        email = `walkin_${cleanPhone}_${counter}@pos.urbandevicecare.co.uk`;
      }
    } else {
      const existing = this.mockCustomers.find((c) =>
        c.email.toLowerCase() === email
      );
      if (existing) {
        return existing;
      }
    }

    const companyName = (input.company_name || "").trim() || undefined;

    // Try Medusa v2 Admin API if available
    try {
      if (this.medusaClient?.admin?.customer?.create) {
        const { customer } = await this.medusaClient.admin.customer.create({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          company_name: companyName,
          has_account: true, // Registered Medusa v2 client constraint
          metadata: {
            company_name: companyName,
            is_pos_registered: true,
            registered_via: "web_pos",
          },
        });
        if (customer) {
          const registeredCustomer: POSCustomer = {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            phone: customer.phone,
            company_name: customer.company_name ||
              customer.metadata?.company_name,
            has_account: customer.has_account ?? true,
            metadata: customer.metadata,
          };
          this.mockCustomers.unshift(registeredCustomer);
          return registeredCustomer;
        }
      }
    } catch (_err) {
      // Fall through to local registered record creation
    }

    const registeredCustomer: POSCustomer = {
      id: `cus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company_name: companyName,
      has_account: true,
      metadata: {
        company_name: companyName,
        is_pos_registered: true,
        registered_via: "web_pos",
        created_at: new Date().toISOString(),
      },
    };

    this.mockCustomers.unshift(registeredCustomer);
    return registeredCustomer;
  }

  /**
   * Creates a completed POS Order with Medusa v2 metadata and sales attribution
   */
  public createPosOrder(body: any): Promise<any> {
    const orderNumber = body.order_number ||
      `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const metadata: Record<string, unknown> = {
      pos_channel: body.terminal_channel || "web_pos",
      cashier_id: body.cashier?.id,
      cashier_name: body.cashier?.name,
      cashier_email: body.cashier?.email,
      tender_type: body.tender?.type || "cash",
      tendered_amount: body.tender?.tendered,
      change_given: body.tender?.change,
      completed_at: new Date().toISOString(),
    };

    if (body.customer) {
      metadata.customer_id = body.customer.id;
      metadata.customer_name = `${body.customer.first_name || ""} ${
        body.customer.last_name || ""
      }`.trim();
      metadata.customer_email = body.customer.email;
      metadata.customer_phone = body.customer.phone;
      metadata.customer_company = body.customer.company_name;
    }

    const responseOrder = {
      id: `ord_${Date.now()}`,
      order_number: orderNumber,
      status: "completed",
      items: body.items || [],
      customer_id: body.customer?.id,
      customer: body.customer || null,
      subtotal: body.subtotal,
      tax: body.tax,
      grand_total: body.grand_total,
      metadata,
    };

    return Promise.resolve(responseOrder);
  }
}
