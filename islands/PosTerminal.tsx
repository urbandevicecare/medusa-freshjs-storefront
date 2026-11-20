import { useEffect, useRef, useState } from "preact/hooks";
import {
  ArrowLeft,
  Barcode,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Key,
  Laptop,
  LogOut,
  Mail,
  Minus,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Tag,
  Trash2,
  User,
  UserPlus,
  Wrench,
  X,
} from "lucide-preact";

interface ProductPart {
  id: string;
  title: string;
  product_title?: string;
  sku?: string;
  barcode?: string;
  price: number;
  inventory_quantity?: number;
  isCustom?: boolean;
}

interface CartItem {
  id: string;
  part: ProductPart;
  quantity: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  role?: string;
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

export interface RepairTicketRecord {
  id: string;
  ticket_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  technician_id?: string;
  technician_name?: string;
  device?: {
    id?: string;
    brand: string;
    model_name: string;
    serial_number?: string;
    imei?: string;
    condition?: string;
    device_type?: string;
  };
  device_name?: string;
  serial_number?: string;
  status:
    | "pending_dropoff"
    | "received"
    | "diagnosing"
    | "awaiting_approval"
    | "repairing"
    | "ready"
    | "completed"
    | "collected"
    | "cancelled"
    | "refunded"
    | string;
  issue_description: string;
  accessories?: string;
  passcode?: string;
  parts_estimate?: number;
  labor_estimate?: number;
  total_estimate?: number;
  parts_actual?: number;
  labor_actual?: number;
  total_actual?: number;
  amount_paid?: number;
  payment_status?: string;
  deposit_amount?: number;
  balance_due?: number;
  warranty_months?: number;
  estimated_completion?: string;
  terms_accepted?: boolean;
  data_wiped_consent?: boolean;
  notes?: Array<{
    id: string;
    content: string;
    is_internal: boolean;
    created_at: string;
  }>;
  updates?: Array<{
    id: string;
    message: string;
    author_type: string;
    author_id?: string;
    created_at: string;
  }>;
  created_at: string;
}

export default function PosTerminal() {
  // Session & Authentication state (Unauthenticated by default until Medusa login)
  const [activeAdmin, setActiveAdmin] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab state: "counter" (POS Register) or "workshop" (Workshop Intake & Repairs)
  const [activeTab, setActiveTab] = useState<"counter" | "workshop">("counter");

  // Terminal Channel
  const [channel] = useState("web_counter_01");

  // Catalog state (Live Medusa v2 Sync, zero dummy data, infinite scroll)
  const [catalog, setCatalog] = useState<ProductPart[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [catalogHasMore, setCatalogHasMore] = useState(true);

  // Live item suggestions while typing
  const [suggestions, setSuggestions] = useState<ProductPart[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Cart & checkout state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [tenderInput, setTenderInput] = useState("");
  const [statusNotice, setStatusNotice] = useState(
    "Ready for barcode scan or SKU lookup.",
  );
  const [lastOrderNum, setLastOrderNum] = useState<string | null>(null);

  // Customer state & Quick Customer pipeline
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(
    null,
  );
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerResults, setCustomerResults] = useState<POSCustomer[]>([]);
  const [cachedCustomers, setCachedCustomers] = useState<POSCustomer[]>([
    {
      id: "cus_01JOHN_DOE",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone: "+254712345678",
      company_name: "Nairobi Tech Ltd",
      has_account: true,
    },
    {
      id: "cus_02JANE_SMITH",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@urbandevicecare.co.uk",
      phone: "+254722998877",
      company_name: "Urban Studios",
      has_account: true,
    },
  ]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(
    null,
  );
  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    companyName: "",
  });

  // Custom Item Modal State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [customSku, setCustomSku] = useState("");

  // Workshop & Repairs Module State
  const [repairs, setRepairs] = useState<RepairTicketRecord[]>([]);
  const [repairsLoading, setRepairsLoading] = useState(false);
  const [repairStatusFilter, setRepairStatusFilter] = useState("all");
  const [repairSearchQuery, setRepairSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<
    RepairTicketRecord | null
  >(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [isIntaking, setIsIntaking] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [updatingTicketStatus, setUpdatingTicketStatus] = useState(false);
  const [ticketStatusSelect, setTicketStatusSelect] = useState<string>(
    "received",
  );
  const [ticketNoteInput, setTicketNoteInput] = useState("");
  const [isAddingTicketNote, setIsAddingTicketNote] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    brand: "Apple",
    modelName: "",
    deviceType: "laptop",
    serialNumber: "",
    imei: "",
    condition: "",
    passcode: "",
    issueDescription: "",
    accessories: "",
    technicianName: "",
    partsEstimate: "0",
    laborEstimate: "2000",
    totalEstimate: "2000",
    depositAmount: "0",
    termsAccepted: true,
    dataWipedConsent: true,
  });

  // Hardware wedge scanner buffer
  const wedgeBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // Restore session from sessionStorage on initial client mount
  useEffect(() => {
    if (typeof globalThis !== "undefined" && globalThis.sessionStorage) {
      try {
        const stored = globalThis.sessionStorage.getItem("pos_admin_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.admin && parsed.token) {
            setActiveAdmin(parsed.admin);
            setAdminToken(parsed.token);
            setStatusNotice(
              `Welcome back, ${parsed.admin.first_name}. Session active.`,
            );
          }
        }
      } catch (_e) {
        // Clear invalid session
        globalThis.sessionStorage.removeItem("pos_admin_session");
      }
    }
  }, []);

  // Initial catalog load when admin is active
  useEffect(() => {
    if (activeAdmin) {
      fetchCatalog(true);
    }
  }, [activeAdmin]);

  // Fetch repairs when switching to workshop tab or when admin logs in
  useEffect(() => {
    if (activeAdmin && activeTab === "workshop") {
      loadRepairs();
    }
  }, [activeAdmin, activeTab, repairStatusFilter]);

  const fetchCatalog = async (reset: boolean = false) => {
    if (catalogLoading && !reset) return;
    const targetOffset = reset ? 0 : catalogOffset;
    setCatalogLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
      const url = `/api/pos/products?limit=20&offset=${targetOffset}`;
      let res = await fetch(url, { headers });
      if (!res.ok) {
        res = await fetch(
          `/api/products?limit=20&page=${Math.floor(targetOffset / 20) + 1}`,
        );
      }

      if (res.ok) {
        const data = await res.json();
        const newProducts: ProductPart[] = data.products || [];
        if (reset) {
          setCatalog(newProducts);
          setCatalogOffset(newProducts.length);
        } else {
          setCatalog((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const unique = newProducts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...unique];
          });
          setCatalogOffset((prev) => prev + newProducts.length);
        }
        setCatalogHasMore(data.has_more ?? (newProducts.length >= 20));
      }
    } catch {
      // Graceful fallback
    } finally {
      setCatalogLoading(false);
    }
  };

  // Debounced live suggestions when typing in search / lookup
  useEffect(() => {
    const term = scanInput.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
        const res = await fetch(
          `/api/pos/products?q=${encodeURIComponent(term)}&limit=8`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          const items: ProductPart[] = data.products || [];
          setSuggestions(items);
          setShowSuggestions(items.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [scanInput, adminToken]);

  // Click outside suggestions dropdown listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    globalThis.addEventListener("mousedown", handleClickOutside);
    return () =>
      globalThis.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRepairs = async () => {
    setRepairsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
      const url = `/api/pos/repairs?status=${
        encodeURIComponent(repairStatusFilter)
      }&q=${encodeURIComponent(repairSearchQuery)}`;
      let res = await fetch(url, { headers });
      if (!res.ok) {
        res = await fetch(
          `/api/repairs?status=${encodeURIComponent(repairStatusFilter)}&q=${
            encodeURIComponent(repairSearchQuery)
          }`,
        );
      }
      if (res.ok) {
        const data = await res.json();
        setRepairs(data.repairs || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setRepairsLoading(false);
    }
  };

  // Hardware barcode scanner wedge listener
  useEffect(() => {
    if (!activeAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") {
        if (
          e.key === "Enter" && targetTag === "input" &&
          (e.target as HTMLElement).id === "manual-scan-input"
        ) {
          e.preventDefault();
          if (
            showSuggestions && selectedSuggestionIndex >= 0 &&
            suggestions[selectedSuggestionIndex]
          ) {
            const chosen = suggestions[selectedSuggestionIndex];
            addToCart(chosen);
            setStatusNotice(`✔ Added ${chosen.title}`);
            setScanInput("");
            setShowSuggestions(false);
          } else {
            handleScanCode(scanInput);
            setScanInput("");
            setShowSuggestions(false);
          }
        }
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime.current > 45) {
        wedgeBuffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (wedgeBuffer.current.length > 2) {
          e.preventDefault();
          const scanned = wedgeBuffer.current.trim();
          wedgeBuffer.current = "";
          handleScanCode(scanned);
        }
      } else if (e.key.length === 1) {
        wedgeBuffer.current += e.key;
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [
    activeAdmin,
    scanInput,
    cart,
    showSuggestions,
    selectedSuggestionIndex,
    suggestions,
  ]);

  // Login handler
  const handleLoginSubmit = async (e?: Event) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const email = loginEmail.trim();
    const password = loginPassword.trim();
    if (!email || !password) {
      setLoginError("Please enter your Medusa admin email and password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/pos/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (!res.ok) {
          throw new Error(
            `Authentication failed: server returned status ${res.status}. Please check Medusa server connection.`,
          );
        }
        throw new Error(
          "Invalid response received from authentication server.",
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Invalid Medusa Admin credentials");
      }

      const session = data;
      if (session && session.admin) {
        setActiveAdmin(session.admin);
        setAdminToken(session.token);
        if (typeof globalThis !== "undefined" && globalThis.sessionStorage) {
          globalThis.sessionStorage.setItem(
            "pos_admin_session",
            JSON.stringify(session),
          );
        }
        setStatusNotice(
          `Logged in as ${session.admin.first_name} (${
            session.admin.role || "Admin"
          }).`,
        );
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in to Medusa Admin");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setActiveAdmin(null);
    setAdminToken(null);
    if (typeof globalThis !== "undefined" && globalThis.sessionStorage) {
      globalThis.sessionStorage.removeItem("pos_admin_session");
    }
    clearCart();
    setSelectedCustomer(null);
    setStatusNotice(
      "Logged out. Please sign in to resume POS register operations.",
    );
  };

  const handleScanCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setStatusNotice(`Scanning: ${code}...`);

    // 1. Check local catalog
    const localMatch = catalog.find(
      (p) =>
        p.sku?.toLowerCase() === code.toLowerCase() ||
        p.barcode?.toLowerCase() === code.toLowerCase() ||
        p.id.toLowerCase() === code.toLowerCase(),
    );

    if (localMatch) {
      addToCart(localMatch);
      setStatusNotice(`✔ Added ${localMatch.title}`);
      return;
    }

    // 2. Query /api/pos/scan endpoint
    try {
      let res = await fetch(`/api/pos/scan?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        res = await fetch(`/api/scan?code=${encodeURIComponent(code)}`);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.type === "part" && data.part) {
          addToCart(data.part);
          setStatusNotice(`✔ Added ${data.part.title}`);
        } else if (data.type === "ticket" && data.ticket) {
          setStatusNotice(
            `✔ Found Repair Ticket #${data.ticket.ticket_number}`,
          );
          setActiveTab("workshop");
          setRepairSearchQuery(data.ticket.ticket_number);
        } else if (data.type === "device" && data.device_history?.[0]) {
          setStatusNotice(
            `✔ Found Serial #${data.device_history[0].serial_number} (${
              data.device_history[0].device_name
            })`,
          );
        } else {
          setStatusNotice(`✖ Unrecognized code: ${code}`);
        }
      }
    } catch {
      setStatusNotice(`✖ Barcode lookup failed for: ${code}`);
    }
  };

  const addToCart = (part: ProductPart, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        return prev.map((item) =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { id: part.id, part, quantity: qty }];
    });
  };

  const addCustomItemToCart = (e?: Event) => {
    if (e) e.preventDefault();
    const title = customTitle.trim();
    const priceNum = parseFloat(customPrice);
    const qtyNum = parseInt(customQuantity, 10) || 1;

    if (!title) {
      alert("Please provide an item description or title.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please provide a valid price.");
      return;
    }

    const customPart: ProductPart = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      price: priceNum,
      sku: customSku.trim() || "CUSTOM",
      barcode: undefined,
      isCustom: true,
    };

    addToCart(customPart, qtyNum);
    setStatusNotice(
      `✔ Added custom item: "${title}" (KES ${priceNum.toFixed(2)})`,
    );

    setCustomTitle("");
    setCustomPrice("");
    setCustomQuantity("1");
    setCustomSku("");
    setShowCustomItemModal(false);
  };

  const updateQuantity = (partId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.part.id === partId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setTenderInput("");
    setStatusNotice("Cart cleared.");
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.part.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.16 * 100) / 100;
  const grandTotal = subtotal + tax;

  const tenderedAmount = parseFloat(tenderInput) || 0;
  const changeDue = tenderedAmount >= grandTotal
    ? tenderedAmount - grandTotal
    : 0;

  // Registered Customer Search with Bearer Token
  const handleCustomerSearch = async (query: string) => {
    setCustomerSearchInput(query);
    setShowCustomerDropdown(true);
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      setCustomerResults([]);
      return;
    }

    let serverCustomers: POSCustomer[] = [];
    try {
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers["Authorization"] = `Bearer ${adminToken}`;
      }

      let res = await fetch(
        `/api/pos/customers?q=${encodeURIComponent(query)}`,
        { headers },
      );
      if (!res.ok) {
        res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`, {
          headers,
        });
      }
      if (res.ok) {
        const data = await res.json();
        serverCustomers = data.customers || [];
      }
    } catch {
      // Offline fallback
    }

    const localMatches = cachedCustomers.filter((c) =>
      `${c.first_name} ${c.last_name || ""}`.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company_name || "").toLowerCase().includes(q)
    );

    const merged: POSCustomer[] = [...serverCustomers];
    const seenIds = new Set(serverCustomers.map((c) => c.id));
    const seenEmails = new Set(
      serverCustomers.map((c) => c.email.toLowerCase()),
    );
    for (const c of localMatches) {
      if (!seenIds.has(c.id) && !seenEmails.has(c.email.toLowerCase())) {
        merged.push(c);
        seenIds.add(c.id);
        seenEmails.add(c.email.toLowerCase());
      }
    }

    setCustomerResults(merged);
  };

  const selectCustomer = (customer: POSCustomer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearchInput("");
    setStatusNotice(
      `✔ Selected client: ${customer.first_name} ${customer.last_name || ""} (${
        customer.phone || customer.email
      })`,
    );
  };

  const openQuickCustomerModal = (presetQuery: string = "") => {
    const trimmed = presetQuery.trim();
    const isEmail = trimmed.includes("@");
    const isPhone = !isEmail && /^[0-9+ -]{5,}$/.test(trimmed);

    let fName = "";
    let lName = "";
    if (!isEmail && !isPhone && trimmed.length > 0) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        fName = parts[0];
        lName = parts.slice(1).join(" ");
      } else {
        fName = trimmed;
      }
    }

    setCustomerForm({
      firstName: fName,
      lastName: lName,
      phone: isPhone ? trimmed : "",
      email: isEmail ? trimmed : "",
      companyName: "",
    });
    setCustomerFormError(null);
    setShowCustomerDropdown(false);
    setShowCustomerModal(true);
  };

  const handleCreateCustomerSubmit = async (e?: Event) => {
    if (e) e.preventDefault();
    setCustomerFormError(null);

    const firstName = customerForm.firstName.trim();
    const lastName = customerForm.lastName.trim();
    const phone = customerForm.phone.trim();
    const email = customerForm.email.trim();
    const companyName = customerForm.companyName.trim();

    if (!firstName) {
      setCustomerFormError("First name is required.");
      return;
    }
    if (!lastName) {
      setCustomerFormError("Last name is required.");
      return;
    }
    if (!phone) {
      setCustomerFormError("Phone number is required.");
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        company_name: companyName || undefined,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

      let res = await fetch("/api/pos/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch("/api/customers", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create customer");
      }

      const data = await res.json();
      const cleanPhone = phone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
        Date.now().toString();
      const newCustomer: POSCustomer = data.customer || {
        id: `cus_${Date.now()}`,
        ...payload,
        has_account: true,
        email: payload.email ||
          `walkin_${cleanPhone}@pos.urbandevicecare.co.uk`,
      };

      setCachedCustomers((prev) => [
        newCustomer,
        ...prev.filter((c) =>
          c.id !== newCustomer.id &&
          c.email.toLowerCase() !== newCustomer.email.toLowerCase()
        ),
      ]);

      setSelectedCustomer(newCustomer);
      setShowCustomerModal(false);
      setCustomerSearchInput("");
      setStatusNotice(
        `✔ Registered and autoselected client: ${newCustomer.first_name} ${
          newCustomer.last_name || ""
        }`,
      );
    } catch (_err) {
      const cleanPhone = phone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
        Date.now().toString();
      const fallbackCustomer: POSCustomer = {
        id: `cus_${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || `walkin_${cleanPhone}@pos.urbandevicecare.co.uk`,
        company_name: companyName || undefined,
        has_account: true,
      };

      setCachedCustomers((prev) => [
        fallbackCustomer,
        ...prev.filter((c) =>
          c.id !== fallbackCustomer.id &&
          c.email.toLowerCase() !== fallbackCustomer.email.toLowerCase()
        ),
      ]);

      setSelectedCustomer(fallbackCustomer);
      setShowCustomerModal(false);
      setCustomerSearchInput("");
      setStatusNotice(
        `✔ Registered and autoselected client: ${fallbackCustomer.first_name} ${
          fallbackCustomer.last_name || ""
        }`,
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Complete Order: Defaults to active admin user if no customer is selected
  const completeCheckout = async () => {
    if (cart.length === 0) {
      setStatusNotice("Cart is empty.");
      return;
    }
    if (!activeAdmin) return;

    // Requirement: if no customer is selected, default to the logged in user as customer
    const effectiveCustomer: POSCustomer = selectedCustomer || {
      id: activeAdmin.id,
      first_name: activeAdmin.first_name,
      last_name: activeAdmin.last_name || "",
      email: activeAdmin.email,
      phone: "",
      company_name: "Urban Device Care Staff",
      has_account: true,
    };

    const orderNum = `POS-${Math.floor(100000 + Math.random() * 900000)}`;
    setLastOrderNum(orderNum);

    const payload = {
      order_number: orderNum,
      cashier: {
        id: activeAdmin.id,
        name: `${activeAdmin.first_name} ${activeAdmin.last_name || ""}`.trim(),
        email: activeAdmin.email,
      },
      customer: effectiveCustomer,
      terminal_channel: channel,
      items: cart.map((c) => ({
        variant_id: c.part.id,
        title: c.part.title,
        sku: c.part.sku,
        quantity: c.quantity,
        unit_price: c.part.price,
        total: c.part.price * c.quantity,
        is_custom: c.part.isCustom || false,
      })),
      subtotal,
      tax,
      grand_total: grandTotal,
      tender: {
        type: "cash",
        tendered: tenderedAmount || grandTotal,
        change: changeDue,
      },
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

      let res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        res = await fetch("/api/checkout", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // offline fallback handled by local state
    }

    const custName = `${effectiveCustomer.first_name} ${
      effectiveCustomer.last_name || ""
    }`.trim();
    clearCart();
    setSelectedCustomer(null);
    setStatusNotice(
      `✔ Order ${orderNum} completed! Tagged to ${activeAdmin.first_name} (Client: ${custName}).`,
    );
  };

  const printReceipt = () => {
    const order = lastOrderNum || "POS-SAMPLE";
    globalThis.open(
      `/api/pos/receipt?order_number=${order}&format=html`,
      "_blank",
    );
    setStatusNotice(`Receipt opened for order #${order}`);
  };

  // Workshop Intake Ticket Submission
  const handleIntakeSubmit = async (e?: Event) => {
    if (e) e.preventDefault();
    setIntakeError(null);

    if (!activeAdmin) return;
    if (!intakeForm.modelName.trim()) {
      setIntakeError("Device model name is required.");
      return;
    }
    if (!intakeForm.issueDescription.trim()) {
      setIntakeError("Fault description is required.");
      return;
    }

    // Default customer to selectedCustomer or activeAdmin
    const effectiveCustomer: POSCustomer = selectedCustomer || {
      id: activeAdmin.id,
      first_name: activeAdmin.first_name,
      last_name: activeAdmin.last_name || "",
      email: activeAdmin.email,
      phone: "",
      company_name: "Urban Device Care Staff",
      has_account: true,
    };

    setIsIntaking(true);
    try {
      const totalEst = parseFloat(intakeForm.totalEstimate) || 0;
      const deposit = parseFloat(intakeForm.depositAmount) || 0;

      const payload = {
        customer_id: effectiveCustomer.id,
        customer_name: `${effectiveCustomer.first_name} ${
          effectiveCustomer.last_name || ""
        }`.trim(),
        customer_phone: effectiveCustomer.phone,
        customer_email: effectiveCustomer.email,
        brand: intakeForm.brand,
        model_name: intakeForm.modelName.trim(),
        device_type: intakeForm.deviceType,
        serial_number: intakeForm.serialNumber.trim() || undefined,
        imei: intakeForm.imei.trim() || undefined,
        condition: intakeForm.condition.trim() || undefined,
        passcode: intakeForm.passcode.trim() || undefined,
        issue_description: intakeForm.issueDescription.trim(),
        accessories: intakeForm.accessories.trim() || undefined,
        technician_name: intakeForm.technicianName.trim() || undefined,
        parts_estimate: parseFloat(intakeForm.partsEstimate) || 0,
        labor_estimate: parseFloat(intakeForm.laborEstimate) || 0,
        total_estimate: totalEst,
        deposit_amount: deposit,
        terms_accepted: intakeForm.termsAccepted,
        data_wiped_consent: intakeForm.dataWipedConsent,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

      let res = await fetch("/api/pos/repairs", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch("/api/repairs", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to book repair ticket");
      }

      const data = await res.json();
      const createdTicket: RepairTicketRecord = data.repair;

      setRepairs((prev) => [createdTicket, ...prev]);
      setShowIntakeModal(false);
      setStatusNotice(
        `✔ Booked Repair Ticket #${createdTicket.ticket_number} for ${createdTicket.device_name}`,
      );

      // Reset intake form
      setIntakeForm({
        brand: "Apple",
        modelName: "",
        deviceType: "laptop",
        serialNumber: "",
        imei: "",
        condition: "",
        passcode: "",
        issueDescription: "",
        accessories: "",
        technicianName: "",
        partsEstimate: "0",
        laborEstimate: "2000",
        totalEstimate: "2000",
        depositAmount: "0",
        termsAccepted: true,
        dataWipedConsent: true,
      });

      // View details of newly created ticket
      setSelectedTicket(createdTicket);
    } catch (err: any) {
      setIntakeError(err.message || "Failed to book repair ticket");
    } finally {
      setIsIntaking(false);
    }
  };

  // Tender Repair Balance: Transports repair ticket balance directly into the Counter Cart!
  const tenderRepairBalance = (ticket: RepairTicketRecord) => {
    const balDue = ticket.balance_due ??
      Math.max(0, (ticket.total_estimate || 0) - (ticket.deposit_amount || 0));

    const repairItem: ProductPart = {
      id: `rep_${ticket.ticket_number}`,
      title: `Repair Balance: #${ticket.ticket_number} - ${
        ticket.device_name || ticket.device?.model_name || "Device"
      }`,
      price: balDue,
      sku: ticket.ticket_number,
      isCustom: true,
    };

    // Attach customer if ticket has customer info
    if (ticket.customer_id) {
      setSelectedCustomer({
        id: ticket.customer_id,
        first_name: ticket.customer_name?.split(" ")[0] || "Client",
        last_name: ticket.customer_name?.split(" ").slice(1).join(" ") || "",
        email: ticket.customer_email ||
          `client_${ticket.ticket_number.toLowerCase()}@pos.urbandevicecare.co.uk`,
        phone: ticket.customer_phone || "",
        has_account: true,
      });
    }

    addToCart(repairItem, 1);
    setSelectedTicket(null);
    setActiveTab("counter");
    setStatusNotice(
      `✔ Loaded #${ticket.ticket_number} balance (KES ${
        balDue.toFixed(2)
      }) into cart. Ready for tender.`,
    );
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setUpdatingTicketStatus(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
      await fetch("/api/pos/repairs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_status",
          ticket_id: selectedTicket.id,
          status: newStatus,
        }),
      });

      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === selectedTicket.id ? { ...r, status: newStatus } : r
        )
      );
      setStatusNotice(
        `✔ Status for #${selectedTicket.ticket_number} updated to ${newStatus}.`,
      );
    } catch {
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === selectedTicket.id ? { ...r, status: newStatus } : r
        )
      );
    } finally {
      setUpdatingTicketStatus(false);
    }
  };

  const handleAddTicketNote = async () => {
    if (!selectedTicket || !ticketNoteInput.trim()) return;
    setIsAddingTicketNote(true);
    try {
      const noteContent = ticketNoteInput.trim();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
      await fetch("/api/pos/repairs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "add_note",
          ticket_id: selectedTicket.id,
          content: noteContent,
          is_internal: true,
        }),
      });

      const newNote = {
        id: `note_${Date.now()}`,
        content: noteContent,
        is_internal: true,
        created_at: new Date().toISOString(),
      };
      setSelectedTicket((prev) =>
        prev ? { ...prev, notes: [...(prev.notes || []), newNote] } : null
      );
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === selectedTicket.id
            ? { ...r, notes: [...(r.notes || []), newNote] }
            : r
        )
      );
      setTicketNoteInput("");
      setStatusNotice(`✔ Note added to #${selectedTicket.ticket_number}.`);
    } catch {
      // fallback
    } finally {
      setIsAddingTicketNote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ready":
      case "completed":
      case "collected":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "diagnosing":
      case "repairing":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "awaiting_approval":
      case "refunded":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "cancelled":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "pending_dropoff":
      case "received":
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getPaymentBadge = (ticket: RepairTicketRecord) => {
    const total = (ticket.total_actual && ticket.total_actual > 0)
      ? ticket.total_actual
      : (ticket.total_estimate || 0);
    const paid = ticket.amount_paid || ticket.deposit_amount || 0;
    if (ticket.payment_status === "refunded") {
      return {
        label: "Refunded",
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    }
    if (
      (paid >= total && (total > 0 || paid > 0)) ||
      ticket.payment_status === "captured"
    ) {
      return {
        label: "Paid",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    }
    if (paid > 0 && paid < total) {
      return {
        label: "Partially Paid",
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    }
    return {
      label: "Unpaid",
      badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    };
  };

  // Filtered repairs
  const filteredRepairs = repairs.filter((r) => {
    const matchesStatus = repairStatusFilter === "all" ||
      r.status.toLowerCase() === repairStatusFilter.toLowerCase();
    if (!matchesStatus) return false;
    if (!repairSearchQuery.trim()) return true;
    const q = repairSearchQuery.toLowerCase();
    return (
      r.ticket_number.toLowerCase().includes(q) ||
      (r.customer_name || "").toLowerCase().includes(q) ||
      (r.device_name || "").toLowerCase().includes(q) ||
      (r.serial_number || "").toLowerCase().includes(q) ||
      (r.technician_name || "").toLowerCase().includes(q) ||
      r.issue_description.toLowerCase().includes(q)
    );
  });

  // ==========================================
  // VIEW: 1. MEDUSA ADMIN LOGIN SCREEN
  // ==========================================
  if (!activeAdmin) {
    return (
      <div class="min-h-screen bg-[#121214] text-white font-sans flex flex-col justify-center items-center p-4 select-none">
        <div class="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div class="text-center mb-6">
            <div class="flex items-center justify-center mb-4">
              <img
                src="/pos-logo.png"
                alt="Urban Device Care POS"
                class="h-16 w-auto max-w-[200px] object-contain drop-shadow"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://i.postimg.cc/q7qsbfm1/Gemini-Generated-Image-i28plli28plli28p-removebg-preview.png";
                }}
              />
            </div>
            <h1 class="text-lg font-bold tracking-tight text-white">
              Urban Device Care • Web POS
            </h1>
            <p class="text-xs text-zinc-400 mt-1">
              Sign in with your Medusa Admin credentials to open till &amp;
              register session
            </p>
          </div>

          {loginError && (
            <div class="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2">
              <span class="font-bold">Error:</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} class="space-x-0 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                Staff Admin Email
              </label>
              <div class="relative">
                <Mail class="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onInput={(e) =>
                    setLoginEmail((e.target as HTMLInputElement).value)}
                  placeholder="e.g. nelly@urbandevicecare.co.uk"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                Admin Password
              </label>
              <div class="relative">
                <Key class="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onInput={(e) =>
                    setLoginPassword((e.target as HTMLInputElement).value)}
                  placeholder="••••••••"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition active:scale-98 shadow flex items-center justify-center space-x-2 mt-2"
            >
              {isLoggingIn ? <span>Authenticating with Medusa...</span> : (
                <>
                  <CheckCircle2 class="w-4 h-4" />
                  <span>Log In to POS Register</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 2. AUTHENTICATED POS TERMINAL
  // ==========================================
  return (
    <div class="min-h-screen bg-[#121214] text-white p-4 font-sans flex flex-col select-none w-full">
      {/* Top Header */}
      <header class="flex flex-wrap items-center justify-between bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-3 mb-3 shadow">
        <div class="flex items-center space-x-3">
          <div class="flex items-center">
            <img
              src="/pos-logo.png"
              alt="Urban Device Care POS"
              class="h-9 w-auto max-w-[120px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://i.postimg.cc/q7qsbfm1/Gemini-Generated-Image-i28plli28plli28p-removebg-preview.png";
              }}
            />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-sm font-bold tracking-tight text-white">
                Urban Device Care • POS
              </h1>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <p class="text-[10px] text-zinc-400 font-mono">
              Fresh.js • {channel}
            </p>
          </div>
        </div>

        {/* Minimalist Segmented Navigation: POS Register vs Repairs */}
        <nav class="flex items-center p-1 bg-[#18181B] border border-zinc-800 rounded-xl shadow-inner gap-1 my-2 sm:my-0">
          <button
            type="button"
            onClick={() => setActiveTab("counter")}
            class={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ${
              activeTab === "counter"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <ShoppingCart class="w-3.5 h-3.5" />
            <span>POS Register</span>
            {cart.length > 0 && (
              <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {cart.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workshop")}
            class={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ${
              activeTab === "workshop"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Wrench class="w-3.5 h-3.5" />
            <span>Repairs</span>
            {repairs.length > 0 && (
              <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {repairs.length}
              </span>
            )}
          </button>
        </nav>

        {/* Active Staff Account & Sign Out */}
        <div class="flex items-center space-x-2">
          <a
            href="/"
            f-client-nav={false}
            class="hidden md:inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#2C2C2E] hover:bg-zinc-700 text-zinc-300 border border-[#3A3A3C] transition active:scale-95"
            title="Return to Online Store"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Storefront</span>
          </a>

          <div class="text-right px-2">
            <p class="text-xs font-semibold text-zinc-200 flex items-center justify-end space-x-1">
              <User class="w-3 h-3 text-emerald-400 inline" />
              <span>
                {activeAdmin.first_name} {activeAdmin.last_name || ""}
              </span>
            </p>
            <p class="text-[10px] text-zinc-400">
              {activeAdmin.role || "Admin"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            class="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition active:scale-95"
            title="Sign out of POS session"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Customer Bar: Selected Client HUD OR Default Admin Client Notice */}
      {selectedCustomer
        ? (
          <div class="flex items-center justify-between bg-emerald-950/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 mb-3 shadow-sm">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <User class="w-4 h-4" />
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-white tracking-wide">
                    {selectedCustomer.first_name}{" "}
                    {selectedCustomer.last_name || ""}
                  </span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Registered Client
                  </span>
                  {selectedCustomer.company_name && (
                    <span class="text-[11px] text-zinc-300 flex items-center space-x-1 font-medium">
                      <Building class="w-3 h-3 text-zinc-400" />
                      <span>{selectedCustomer.company_name}</span>
                    </span>
                  )}
                </div>
                <div class="flex items-center space-x-3 text-[10px] text-zinc-400 font-mono mt-0.5">
                  <span class="flex items-center space-x-1">
                    <Phone class="w-3 h-3 text-zinc-500" />
                    <span>{selectedCustomer.phone || "No phone"}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <Mail class="w-3 h-3 text-zinc-500" />
                    <span>{selectedCustomer.email}</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setStatusNotice(
                  "Unlinked client. Defaulting to logged-in staff account.",
                );
              }}
              class="inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg bg-[#2C2C2E] border border-[#3A3A3C] transition active:scale-95"
              title="Unlink Customer (Default to Staff)"
            >
              <X class="w-3.5 h-3.5" />
              <span>Unlink (Use Staff)</span>
            </button>
          </div>
        )
        : (
          <div class="relative mb-3">
            <div class="flex items-center space-x-2">
              <div class="relative flex-1">
                <User class="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={customerSearchInput}
                  onInput={(e) =>
                    handleCustomerSearch((e.target as HTMLInputElement).value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder={`Search registered customer (or leave blank to default to ${activeAdmin.first_name} ${
                    activeAdmin.last_name || ""
                  })...`}
                  class="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                />
                {customerSearchInput && (
                  <button
                    onClick={() => {
                      setCustomerSearchInput("");
                      setCustomerResults([]);
                      setShowCustomerDropdown(false);
                    }}
                    class="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => openQuickCustomerModal(customerSearchInput)}
                class="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow whitespace-nowrap"
                title="Add a new customer profile"
              >
                <UserPlus class="w-3.5 h-3.5" />
                <span>+ Quick Customer</span>
              </button>
            </div>

            {/* Autocomplete Suggestions Dropdown with Live Medusa Search */}
            {showCustomerDropdown && customerSearchInput.trim().length > 0 && (
              <div class="absolute left-0 right-0 top-full mt-1 bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto p-1.5">
                {customerResults.length > 0
                  ? (
                    <div class="space-y-1">
                      <div class="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 tracking-wider">
                        Found Registered Clients ({customerResults.length})
                      </div>
                      {customerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          class="p-2 rounded-lg hover:bg-[#2C2C2E] cursor-pointer flex items-center justify-between transition group"
                        >
                          <div>
                            <div class="flex items-center space-x-2">
                              <p class="text-xs font-semibold text-zinc-100 group-hover:text-white">
                                {c.first_name} {c.last_name || ""}
                              </p>
                              <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                Registered
                              </span>
                              {c.company_name && (
                                <span class="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {c.company_name}
                                </span>
                              )}
                            </div>
                            <p class="text-[10px] text-zinc-400 font-mono">
                              {c.phone || "No phone"} • {c.email}
                            </p>
                          </div>
                          <span class="text-[11px] font-medium text-blue-400 group-hover:underline">
                            Select →
                          </span>
                        </div>
                      ))}
                      <div class="border-t border-[#2C2C2E] pt-1 mt-1">
                        <button
                          onClick={() =>
                            openQuickCustomerModal(customerSearchInput)}
                          class="w-full text-left p-2 rounded-lg hover:bg-[#2C2C2E] text-xs text-emerald-400 font-semibold flex items-center space-x-1.5"
                        >
                          <UserPlus class="w-3.5 h-3.5" />
                          <span>
                            Not listed? Register new client
                            "{customerSearchInput}"
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                  : (
                    <div class="p-3 text-center">
                      <p class="text-xs text-zinc-400 mb-2">
                        No registered client found matching
                        "<span class="text-white font-medium">
                          {customerSearchInput}
                        </span>"
                      </p>
                      <button
                        onClick={() =>
                          openQuickCustomerModal(customerSearchInput)}
                        class="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow"
                      >
                        <UserPlus class="w-3.5 h-3.5" />
                        <span>Quick Register "{customerSearchInput}"</span>
                      </button>
                    </div>
                  )}
              </div>
            )}

            {/* Fallback Notice */}
            <div class="flex items-center justify-between text-[11px] text-zinc-500 mt-1 px-1">
              <span>
                Default Client:{" "}
                <strong class="text-zinc-300">
                  {activeAdmin.first_name} {activeAdmin.last_name || ""}
                </strong>{" "}
                ({activeAdmin.email})
              </span>
              <span>
                All sales &amp; repairs will be tagged under staff account if
                unselected
              </span>
            </div>
          </div>
        )}

      {/* ==================================================== */}
      {/* TAB 1: COUNTER POS WORKSPACE                         */}
      {/* ==================================================== */}
      {activeTab === "counter" && (
        <div class="flex-1 flex flex-col">
          {/* Barcode Search, Live Name/Title Suggestions & Custom Item Button */}
          <div class="flex items-center space-x-2 mb-4">
            <div class="relative flex-1">
              <Barcode class="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                ref={searchInputRef}
                id="manual-scan-input"
                type="text"
                value={scanInput}
                onInput={(e) =>
                  setScanInput((e.target as HTMLInputElement).value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (showSuggestions && suggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev < suggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev > 0 ? prev - 1 : suggestions.length - 1
                      );
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }
                }}
                placeholder="Scan barcode or type item title / SKU / service name..."
                class="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
              {scanInput && (
                <button
                  type="button"
                  onClick={() => {
                    setScanInput("");
                    setShowSuggestions(false);
                  }}
                  class="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                  title="Clear input"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating Live Suggestions Dropdown */}
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  class="absolute left-0 right-0 top-full mt-1.5 bg-[#1C1C1E] border border-zinc-700/80 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-zinc-800/80"
                >
                  {suggestionsLoading && suggestions.length === 0
                    ? (
                      <div class="p-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <RefreshCw class="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span>Searching catalog...</span>
                      </div>
                    )
                    : (
                      suggestions.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            addToCart(item);
                            setStatusNotice(`✔ Added ${item.title}`);
                            setScanInput("");
                            setShowSuggestions(false);
                          }}
                          class={`p-2.5 cursor-pointer flex items-center justify-between transition ${
                            idx === selectedSuggestionIndex
                              ? "bg-blue-600/20 text-white"
                              : "hover:bg-zinc-800/80 text-zinc-200"
                          }`}
                        >
                          <div class="flex-1 min-w-0 pr-3">
                            <p class="text-xs font-medium text-white truncate">
                              {item.title}
                            </p>
                            <div class="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.barcode && (
                                <span>• Barcode: {item.barcode}</span>
                              )}
                              {typeof item.inventory_quantity === "number" && (
                                <span
                                  class={item.inventory_quantity > 0
                                    ? "text-emerald-400"
                                    : "text-amber-400"}
                                >
                                  • {item.inventory_quantity > 0
                                    ? `${item.inventory_quantity} in stock`
                                    : "Out of stock"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div class="text-right shrink-0">
                            <span class="text-xs font-bold text-blue-400">
                              KES {item.price.toFixed(2)}
                            </span>
                            <div class="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                              <Plus class="w-3 h-3" />
                              <span>Add</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                handleScanCode(scanInput);
                setScanInput("");
                setShowSuggestions(false);
              }}
              class="inline-flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow"
            >
              <Search class="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
            <button
              onClick={() =>
                setShowCustomItemModal(true)}
              class="inline-flex items-center space-x-1 px-3 py-2 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition active:scale-95 shadow"
              title="Add non-registered or custom item to cart"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ Custom Item</span>
            </button>
          </div>

          {/* 2-Column Register Grid */}
          <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Catalog with Infinite Scroll */}
            <section class="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-3 flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Parts &amp; Services Catalog
                  </h2>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {catalog.length} items
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchCatalog(true)}
                  disabled={catalogLoading}
                  class="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition disabled:opacity-50"
                  title="Refresh catalog from Medusa"
                >
                  <RefreshCw
                    class={`w-3 h-3 ${
                      catalogLoading ? "animate-spin text-blue-400" : ""
                    }`}
                  />
                  <span>Sync</span>
                </button>
              </div>

              <div
                onScroll={(e) => {
                  const target = e.currentTarget;
                  if (
                    target.scrollHeight - target.scrollTop -
                          target.clientHeight < 80 &&
                    !catalogLoading &&
                    catalogHasMore
                  ) {
                    fetchCatalog(false);
                  }
                }}
                class="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]"
              >
                {catalog.length === 0 && !catalogLoading
                  ? (
                    <div class="py-12 text-center text-zinc-500">
                      <Tag class="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p class="text-xs font-medium text-zinc-400">
                        No catalog items available
                      </p>
                      <p class="text-[10px] text-zinc-500 mt-1">
                        Add products in Medusa Admin or use the Custom Item
                        button above
                      </p>
                    </div>
                  )
                  : (
                    catalog.map((part) => (
                      <div
                        key={part.id}
                        onClick={() => addToCart(part)}
                        class="bg-[#2C2C2E] hover:bg-zinc-700/60 p-2.5 rounded-lg border border-[#3A3A3C] flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
                      >
                        <div class="flex-1 min-w-0 pr-2">
                          <p class="text-xs font-medium text-zinc-100 group-hover:text-white truncate">
                            {part.title}
                          </p>
                          <p class="text-[10px] text-zinc-400 font-mono">
                            SKU: {part.sku || "N/A"} • Barcode:{" "}
                            {part.barcode || "N/A"}
                            {typeof part.inventory_quantity === "number" && (
                              <span
                                class={part.inventory_quantity > 0
                                  ? " text-emerald-400 ml-1.5"
                                  : " text-amber-400 ml-1.5"}
                              >
                                ({part.inventory_quantity} in stock)
                              </span>
                            )}
                          </p>
                        </div>
                        <div class="text-right shrink-0">
                          <span class="text-xs font-bold text-blue-400">
                            KES {part.price.toFixed(2)}
                          </span>
                          <div class="text-[10px] text-zinc-400 flex items-center justify-end space-x-0.5 group-hover:text-emerald-400">
                            <Plus class="w-3 h-3 text-zinc-400 group-hover:text-emerald-400" />
                            <span>Add</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                {catalogLoading && (
                  <div class="py-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <RefreshCw class="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Loading items...</span>
                  </div>
                )}

                {!catalogHasMore && catalog.length > 0 && (
                  <div class="py-2 text-center text-[10px] text-zinc-500">
                    End of catalog ({catalog.length} items loaded)
                  </div>
                )}
              </div>
            </section>

            {/* Right: Cart & Tender */}
            <section class="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <ShoppingCart class="w-3.5 h-3.5 text-zinc-400" />
                    <h2 class="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Active Sale Cart ({cart.length} items)
                    </h2>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      class="inline-flex items-center space-x-1 text-[11px] text-red-400 hover:text-red-300"
                    >
                      <Trash2 class="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div class="max-h-56 overflow-y-auto space-y-2 mb-3 pr-1">
                  {cart.length === 0
                    ? (
                      <div class="text-center py-10 text-xs text-zinc-500">
                        Cart is empty. Scan an item, pick a part, or tap "+
                        Custom Item".
                      </div>
                    )
                    : (
                      cart.map((item) => (
                        <div
                          key={item.id}
                          class="bg-[#2C2C2E] p-2 rounded-lg border border-[#3A3A3C] flex items-center justify-between"
                        >
                          <div class="flex-1 mr-2">
                            <div class="flex items-center space-x-1.5">
                              <p class="text-xs text-zinc-200 line-clamp-1">
                                {item.part.title}
                              </p>
                              {item.part.isCustom && (
                                <span class="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p class="text-[10px] text-zinc-400">
                              KES {item.part.price.toFixed(2)} each
                            </p>
                          </div>
                          <div class="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.part.id, -1)}
                              class="w-6 h-6 rounded bg-[#3A3A3C] hover:bg-zinc-600 flex items-center justify-center text-xs font-bold text-zinc-200 transition"
                            >
                              <Minus class="w-3 h-3" />
                            </button>
                            <span class="text-xs font-mono w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.part.id, 1)}
                              class="w-6 h-6 rounded bg-[#3A3A3C] hover:bg-zinc-600 flex items-center justify-center text-xs font-bold text-zinc-200 transition"
                            >
                              <Plus class="w-3 h-3" />
                            </button>
                            <span class="text-xs font-bold text-emerald-400 w-20 text-right font-mono">
                              KES {(item.part.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </div>

              {/* Totals & Quick Tender */}
              <div class="border-t border-[#2C2C2E] pt-3">
                <div class="space-y-1 mb-3">
                  <div class="flex justify-between text-xs text-zinc-400">
                    <span>Subtotal:</span>
                    <span class="font-mono">KES {subtotal.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-xs text-zinc-400">
                    <span>VAT (16%):</span>
                    <span class="font-mono">KES {tax.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#2C2C2E]">
                    <span>TOTAL DUE:</span>
                    <span class="text-blue-400 font-mono">
                      KES {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div class="grid grid-cols-5 gap-1.5 mb-2">
                  <button
                    onClick={() => setTenderInput(grandTotal.toFixed(2))}
                    class="py-1.5 bg-[#2C2C2E] hover:bg-zinc-700 text-[11px] rounded font-semibold text-zinc-200 border border-[#3A3A3C] transition"
                  >
                    Exact
                  </button>
                  <button
                    onClick={() => setTenderInput("500.00")}
                    class="py-1.5 bg-[#2C2C2E] hover:bg-zinc-700 text-[11px] rounded font-semibold text-zinc-200 border border-[#3A3A3C] transition"
                  >
                    500
                  </button>
                  <button
                    onClick={() => setTenderInput("1000.00")}
                    class="py-1.5 bg-[#2C2C2E] hover:bg-zinc-700 text-[11px] rounded font-semibold text-zinc-200 border border-[#3A3A3C] transition"
                  >
                    1,000
                  </button>
                  <button
                    onClick={() => setTenderInput("2000.00")}
                    class="py-1.5 bg-[#2C2C2E] hover:bg-zinc-700 text-[11px] rounded font-semibold text-zinc-200 border border-[#3A3A3C] transition"
                  >
                    2,000
                  </button>
                  <button
                    onClick={() => setTenderInput("5000.00")}
                    class="py-1.5 bg-[#2C2C2E] hover:bg-zinc-700 text-[11px] rounded font-semibold text-zinc-200 border border-[#3A3A3C] transition"
                  >
                    5,000
                  </button>
                </div>

                <div class="flex items-center justify-between bg-[#2C2C2E] p-2 rounded-lg border border-[#3A3A3C] mb-3">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-zinc-400">Tendered:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tenderInput}
                      onInput={(e) =>
                        setTenderInput((e.target as HTMLInputElement).value)}
                      placeholder="0.00"
                      class="w-24 bg-[#1C1C1E] border border-[#3A3A3C] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div class="text-right">
                    <span class="text-xs text-zinc-400 mr-2">Change:</span>
                    <span class="text-xs font-bold text-emerald-400 font-mono">
                      KES {changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Checkout & Print Buttons */}
                <div class="grid grid-cols-2 gap-2">
                  <button
                    onClick={printReceipt}
                    class="inline-flex items-center justify-center space-x-1.5 py-2.5 bg-[#2C2C2E] hover:bg-zinc-700 border border-[#3A3A3C] rounded-lg text-xs font-semibold text-zinc-200 transition active:scale-95"
                  >
                    <Printer class="w-4 h-4" />
                    <span>Print 58mm ESC/POS</span>
                  </button>
                  <button
                    onClick={completeCheckout}
                    disabled={cart.length === 0}
                    class="inline-flex items-center justify-center space-x-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow"
                  >
                    <CheckCircle2 class="w-4 h-4" />
                    <span>Charge Cash &amp; Complete</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: WORKSHOP INTAKE & REPAIRS MODULE              */}
      {/* ==================================================== */}
      {activeTab === "workshop" && (
        <div class="flex-1 flex flex-col">
          {/* Top Actions: Search, Filter Tabs, and Book Intake Button */}
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4 bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-3">
            <div class="flex items-center space-x-2 flex-1 min-w-[240px]">
              <Search class="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={repairSearchQuery}
                onInput={(e) =>
                  setRepairSearchQuery((e.target as HTMLInputElement).value)}
                placeholder="Search ticket #, client, device model, or serial..."
                class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter Tabs */}
            <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "All" },
                { id: "pending_dropoff", label: "Dropoff" },
                { id: "received", label: "Received" },
                { id: "diagnosing", label: "Diagnosing" },
                { id: "awaiting_approval", label: "Approval" },
                { id: "repairing", label: "Repairing" },
                { id: "ready", label: "Ready" },
                { id: "completed", label: "Completed" },
                { id: "collected", label: "Collected" },
                { id: "cancelled", label: "Cancelled" },
                { id: "refunded", label: "Refunded" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setRepairStatusFilter(st.id)}
                  class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    repairStatusFilter === st.id
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div class="flex items-center space-x-2">
              <button
                onClick={loadRepairs}
                class="p-2 bg-[#2C2C2E] hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition"
                title="Refresh Repairs"
              >
                <RefreshCw class="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowIntakeModal(true)}
                class="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>+ Book Repair Intake</span>
              </button>
            </div>
          </div>

          {/* Repairs Table (Rows View) */}
          <div class="flex-1 overflow-hidden flex flex-col bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl shadow-sm">
            <div
              tabIndex={0}
              role="region"
              aria-label="Repair tickets directory"
              class="flex-1 overflow-x-auto overflow-y-auto"
            >
              {repairsLoading
                ? (
                  <div class="text-center py-20 text-xs text-zinc-400">
                    <div class="inline-block animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mb-2">
                    </div>
                    <p>Loading repair tickets from Medusa workshop...</p>
                  </div>
                )
                : filteredRepairs.length === 0
                ? (
                  <div class="text-center py-20">
                    <Wrench class="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p class="text-sm font-semibold text-zinc-300">
                      No repair tickets found
                    </p>
                    <p class="text-xs text-zinc-500 mt-1">
                      Tap "+ Book Repair Intake" to register a new customer
                      device
                    </p>
                  </div>
                )
                : (
                  <table class="w-full text-left border-collapse min-w-[760px]">
                    <thead class="sticky top-0 bg-[#161618] z-10 text-[11px] uppercase tracking-wider font-semibold text-zinc-400 border-b border-[#2C2C2E]">
                      <tr>
                        <th scope="col" class="py-3 px-4">Ticket</th>
                        <th scope="col" class="py-3 px-4">
                          Device &amp; Issue
                        </th>
                        <th scope="col" class="py-3 px-4">Client</th>
                        <th scope="col" class="py-3 px-4">Tech / Serial</th>
                        <th scope="col" class="py-3 px-4">Status</th>
                        <th scope="col" class="py-3 px-4">Payment</th>
                        <th scope="col" class="py-3 px-4 text-right">
                          Balance Due
                        </th>
                        <th scope="col" class="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#2C2C2E]/60 text-xs">
                      {filteredRepairs.map((r) => {
                        const bal = r.balance_due ??
                          Math.max(
                            0,
                            (r.total_estimate || 0) - (r.deposit_amount || 0),
                          );
                        const payBadge = getPaymentBadge(r);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedTicket(r)}
                            class="hover:bg-[#252528] transition-colors cursor-pointer group"
                          >
                            {/* Ticket # & Date */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <div class="font-mono font-bold text-blue-400 group-hover:underline flex items-center space-x-1">
                                <span>#{r.ticket_number}</span>
                              </div>
                              <span class="text-[10px] text-zinc-500 font-mono block mt-0.5">
                                {r.created_at
                                  ? new Date(r.created_at).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )
                                  : "—"}
                              </span>
                            </td>

                            {/* Device & Issue */}
                            <td class="py-3 px-4 max-w-xs md:max-w-sm">
                              <div class="font-bold text-zinc-100 truncate">
                                {r.device_name || r.device?.model_name ||
                                  "Device"}
                              </div>
                              <div
                                class="text-[11px] text-zinc-400 truncate mt-0.5"
                                title={r.issue_description}
                              >
                                {r.issue_description ||
                                  "No issue details recorded"}
                              </div>
                            </td>

                            {/* Client */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <div class="text-zinc-200 font-medium truncate max-w-[140px]">
                                {r.customer_name || "Staff Client"}
                              </div>
                              {r.customer_phone && (
                                <div class="text-[10px] text-zinc-500 font-mono mt-0.5">
                                  {r.customer_phone}
                                </div>
                              )}
                            </td>

                            {/* Tech / Serial */}
                            <td class="py-3 px-4 whitespace-nowrap text-zinc-400 text-[11px] font-mono">
                              {r.technician_name
                                ? (
                                  <div class="text-zinc-300 truncate max-w-[120px]">
                                    <span class="text-zinc-500">Tech:</span>
                                    {" "}
                                    {r.technician_name}
                                  </div>
                                )
                                : null}
                              {r.serial_number
                                ? (
                                  <div
                                    class="text-[10px] text-zinc-500 truncate max-w-[130px]"
                                    title={r.serial_number}
                                  >
                                    S/N: {r.serial_number}
                                  </div>
                                )
                                : null}
                              {!r.technician_name && !r.serial_number && (
                                <span class="text-zinc-600">—</span>
                              )}
                            </td>

                            {/* Repair Status Badge */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <span
                                class={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border inline-block ${
                                  getStatusBadge(r.status)
                                }`}
                              >
                                {r.status.replace("_", " ")}
                              </span>
                            </td>

                            {/* Payment Status Badge */}
                            <td class="py-3 px-4 whitespace-nowrap">
                              <span
                                class={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block ${payBadge.badgeClass}`}
                              >
                                {payBadge.label}
                              </span>
                            </td>

                            {/* Balance Due */}
                            <td class="py-3 px-4 whitespace-nowrap text-right font-mono">
                              <div class="font-bold text-emerald-400">
                                KES {bal.toFixed(2)}
                              </div>
                              {r.total_estimate && r.total_estimate > 0 && (
                                <div class="text-[10px] text-zinc-500">
                                  Total: KES {r.total_estimate.toFixed(2)}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td class="py-3 px-4 whitespace-nowrap text-right">
                              <div class="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    tenderRepairBalance(r);
                                  }}
                                  class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow inline-flex items-center space-x-1"
                                  title="Tender repair balance into cart"
                                >
                                  <ShoppingCart class="w-3 h-3" />
                                  <span>Tender</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTicket(r);
                                  }}
                                  class="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#2C2C2E] transition"
                                  title="View ticket details"
                                >
                                  <ExternalLink class="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
            {/* Table Footer with Count */}
            <div class="px-4 py-2 border-t border-[#2C2C2E] bg-[#161618] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
              <span>
                Showing {filteredRepairs.length} of {repairs.length}{" "}
                repair tickets
              </span>
              <span class="text-zinc-600">
                Click any row to view &amp; update ticket details
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer class="mt-3 pt-2 border-t border-[#2C2C2E] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
        <span>Status: {statusNotice}</span>
        <span class="text-zinc-600">
          Urban Device Care • Medusa v2 Admin POS
        </span>
      </footer>

      {/* ==================================================== */}
      {/* MODAL 1: REPAIR TICKET DETAILS MODAL                */}
      {/* ==================================================== */}
      {selectedTicket && (
        <div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl p-5 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2C2E]">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <Wrench class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h3 class="text-sm font-bold text-white">
                      Repair Ticket #{selectedTicket.ticket_number}
                    </h3>
                    <span
                      class={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        getPaymentBadge(
                          selectedTicket,
                        ).badgeClass
                      }`}
                    >
                      {getPaymentBadge(selectedTicket).label}
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-400">
                    Created:{" "}
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#2C2C2E]"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3 text-xs">
              {/* Quick Status Updater */}
              <div class="bg-[#242426] p-3 rounded-lg border border-[#3A3A3C] flex items-center justify-between gap-2">
                <div class="flex items-center space-x-2">
                  <span class="text-[11px] font-semibold text-zinc-300">
                    Status:
                  </span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) =>
                      handleUpdateTicketStatus(
                        (e.target as HTMLSelectElement).value,
                      )}
                    disabled={updatingTicketStatus}
                    class="bg-[#1C1C1E] border border-[#3A3A3C] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 capitalize"
                  >
                    <option value="pending_dropoff">Pending Dropoff</option>
                    <option value="received">Received</option>
                    <option value="diagnosing">Diagnosing</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="repairing">Repairing</option>
                    <option value="ready">Ready for Pickup</option>
                    <option value="completed">Completed</option>
                    <option value="collected">Collected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                {updatingTicketStatus && (
                  <span class="text-[10px] text-blue-400 animate-pulse">
                    Updating...
                  </span>
                )}
              </div>

              {/* Device & Client Card */}
              <div class="bg-[#2C2C2E] p-3 rounded-lg border border-[#3A3A3C]">
                <h4 class="font-bold text-zinc-200 mb-1 flex items-center space-x-1.5">
                  <Laptop class="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Device: {selectedTicket.device_name ||
                      selectedTicket.device?.model_name}
                  </span>
                </h4>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono mt-2">
                  <div>Serial: {selectedTicket.serial_number || "None"}</div>
                  <div>
                    Passcode: {selectedTicket.passcode || "None provided"}
                  </div>
                  <div>Brand: {selectedTicket.device?.brand || "Apple"}</div>
                  <div>Accessories: {selectedTicket.accessories || "None"}</div>
                  {selectedTicket.device?.condition && (
                    <div class="col-span-2">
                      Condition: {selectedTicket.device.condition}
                    </div>
                  )}
                  {selectedTicket.technician_name && (
                    <div class="col-span-2 text-zinc-300">
                      Technician: {selectedTicket.technician_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Fault & Diagnostics */}
              <div>
                <label class="block text-[11px] font-semibold text-zinc-400 mb-0.5">
                  Fault &amp; Diagnostics
                </label>
                <p class="bg-[#2C2C2E] p-2.5 rounded-lg border border-[#3A3A3C] text-zinc-200 text-xs">
                  {selectedTicket.issue_description}
                </p>
              </div>

              {/* Notes & Updates Section */}
              <div class="bg-[#2C2C2E] p-3 rounded-lg border border-[#3A3A3C] space-y-2">
                <span class="text-[11px] font-semibold text-zinc-300 block">
                  Repair Notes &amp; Updates:
                </span>
                {selectedTicket.notes && selectedTicket.notes.length > 0
                  ? (
                    <div class="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {selectedTicket.notes.map((n) => (
                        <div
                          key={n.id}
                          class="p-2 rounded bg-[#1C1C1E] border border-zinc-700/50 text-[11px] text-zinc-300"
                        >
                          <p>{n.content}</p>
                          <span class="text-[9px] text-zinc-500 font-mono mt-0.5 block">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                  : (
                    <p class="text-[10px] text-zinc-500 italic">
                      No workshop notes recorded yet.
                    </p>
                  )}

                {/* Add Note Input */}
                <div class="flex items-center space-x-1.5 pt-1">
                  <input
                    type="text"
                    value={ticketNoteInput}
                    onInput={(e) =>
                      setTicketNoteInput((e.target as HTMLInputElement).value)}
                    placeholder="Add technician note..."
                    class="flex-1 bg-[#1C1C1E] border border-[#3A3A3C] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTicketNote}
                    disabled={isAddingTicketNote || !ticketNoteInput.trim()}
                    class="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-xs font-medium transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div class="bg-[#2C2C2E] p-3 rounded-lg border border-[#3A3A3C] space-y-1 font-mono text-xs">
                <div class="flex justify-between text-zinc-400">
                  <span>Total Estimate:</span>
                  <span>
                    KES {(selectedTicket.total_estimate || 0).toFixed(2)}
                  </span>
                </div>
                <div class="flex justify-between text-zinc-400">
                  <span>Deposit Paid:</span>
                  <span>
                    KES {(selectedTicket.deposit_amount ||
                      selectedTicket.amount_paid || 0).toFixed(2)}
                  </span>
                </div>
                <div class="flex justify-between text-emerald-400 font-bold pt-1 border-t border-[#3A3A3C]">
                  <span>Balance Due:</span>
                  <span>
                    KES {(selectedTicket.balance_due ??
                      Math.max(
                        0,
                        (selectedTicket.total_estimate || 0) -
                          (selectedTicket.deposit_amount || 0),
                      )).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                class="py-2.5 bg-[#2C2C2E] hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => tenderRepairBalance(selectedTicket)}
                class="py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-lg text-white transition flex items-center justify-center space-x-1.5 shadow"
              >
                <ShoppingCart class="w-3.5 h-3.5" />
                <span>Add to Cart / Tender</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: BOOK REPAIR INTAKE MODAL                   */}
      {/* ==================================================== */}
      {showIntakeModal && (
        <div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl p-5 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2C2E]">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Wrench class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white">
                    Workshop Repair Intake
                  </h3>
                  <p class="text-[11px] text-zinc-400">
                    Book device into Medusa Workshop System
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIntakeModal(false)}
                class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#2C2C2E]"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            {intakeError && (
              <div class="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {intakeError}
              </div>
            )}

            <form onSubmit={handleIntakeSubmit} class="space-y-3">
              {/* Attached Customer Notice */}
              <div class="bg-[#2C2C2E] p-2.5 rounded-lg border border-[#3A3A3C] flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-zinc-400 uppercase font-bold block">
                    Intake Client:
                  </span>
                  <span class="text-xs font-semibold text-white">
                    {selectedCustomer
                      ? `${selectedCustomer.first_name} ${
                        selectedCustomer.last_name || ""
                      } (${selectedCustomer.phone || selectedCustomer.email})`
                      : `${activeAdmin.first_name} ${
                        activeAdmin.last_name || ""
                      } (Logged-in Staff Account)`}
                  </span>
                </div>
                {!selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => openQuickCustomerModal()}
                    class="text-[11px] text-emerald-400 hover:underline"
                  >
                    + Assign Client
                  </button>
                )}
              </div>

              {/* Device Details */}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Brand
                  </label>
                  <select
                    value={intakeForm.brand}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        brand: (e.target as HTMLSelectElement).value,
                      })}
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Google">Google</option>
                    <option value="Dell">Dell</option>
                    <option value="HP">HP</option>
                    <option value="Lenovo">Lenovo</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Device Type
                  </label>
                  <select
                    value={intakeForm.deviceType}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        deviceType: (e.target as HTMLSelectElement).value,
                      })}
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="laptop">Laptop / MacBook</option>
                    <option value="smartphone">Smartphone / iPhone</option>
                    <option value="tablet">Tablet / iPad</option>
                    <option value="desktop">Desktop / Mac Mini</option>
                    <option value="smartwatch">Smartwatch / Apple Watch</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Model Name <span class="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={intakeForm.modelName}
                  onInput={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      modelName: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="e.g. MacBook Pro 16-inch (M1 Max, A2485) or iPhone 15 Pro"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={intakeForm.serialNumber}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        serialNumber: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g. C02G4120MD6R"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    IMEI
                  </label>
                  <input
                    type="text"
                    value={intakeForm.imei}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        imei: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="Optional IMEI"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Device Condition
                  </label>
                  <input
                    type="text"
                    value={intakeForm.condition}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        condition: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g. Minor scratches, screen cracked"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Device Passcode
                  </label>
                  <input
                    type="text"
                    value={intakeForm.passcode}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        passcode: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g. 1234 or Pattern"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Fault / Issue Description <span class="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={intakeForm.issueDescription}
                  onInput={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      issueDescription: (e.target as HTMLTextAreaElement).value,
                    })}
                  placeholder="Describe damage, symptoms, customer report, and requested repair service..."
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Accessories Left With Device
                </label>
                <input
                  type="text"
                  value={intakeForm.accessories}
                  onInput={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      accessories: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="e.g. Magsafe 3 Charger 140W, Sleeve, SIM Tray"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Total Estimate (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={intakeForm.totalEstimate}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        totalEstimate: (e.target as HTMLInputElement).value,
                      })}
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Deposit Paid (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={intakeForm.depositAmount}
                    onInput={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        depositAmount: (e.target as HTMLInputElement).value,
                      })}
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Compliance & Consent Checkboxes */}
              <div class="space-y-1.5 pt-1">
                <label class="flex items-center space-x-2 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={intakeForm.termsAccepted}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        termsAccepted: (e.target as HTMLInputElement).checked,
                      })}
                    class="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <span>Customer accepted Workshop Terms &amp; Conditions</span>
                </label>
                <label class="flex items-center space-x-2 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={intakeForm.dataWipedConsent}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        dataWipedConsent:
                          (e.target as HTMLInputElement).checked,
                      })}
                    class="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <span>Data wipe and diagnostics consent confirmed</span>
                </label>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-3 border-t border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  class="py-2.5 bg-[#2C2C2E] hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIntaking}
                  class="py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white transition flex items-center justify-center space-x-1.5 shadow"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>
                    {isIntaking
                      ? "Registering Ticket..."
                      : "Book & Create Ticket"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD CUSTOM ITEM MODAL                       */}
      {/* ==================================================== */}
      {showCustomItemModal && (
        <div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2C2E]">
              <div class="flex items-center space-x-2">
                <Tag class="w-4 h-4 text-amber-400" />
                <h3 class="text-sm font-bold text-white">
                  Add Custom Item to Cart
                </h3>
              </div>
              <button
                onClick={() => setShowCustomItemModal(false)}
                class="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#2C2C2E]"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={addCustomItemToCart} class="space-y-3">
              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Item Description / Title <span class="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onInput={(e) =>
                    setCustomTitle((e.target as HTMLInputElement).value)}
                  placeholder="e.g. Tempered Glass Screen Protector"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Price (KES) <span class="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customPrice}
                    onInput={(e) =>
                      setCustomPrice((e.target as HTMLInputElement).value)}
                    placeholder="0.00"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customQuantity}
                    onInput={(e) =>
                      setCustomQuantity((e.target as HTMLInputElement).value)}
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  SKU / Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={customSku}
                  onInput={(e) =>
                    setCustomSku((e.target as HTMLInputElement).value)}
                  placeholder="CUSTOM"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div class="grid grid-cols-2 gap-2 pt-3 border-t border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  class="py-2.5 bg-[#2C2C2E] hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="py-2.5 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-lg text-white transition flex items-center justify-center space-x-1 shadow"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: QUICK CUSTOMER REGISTRATION MODAL          */}
      {/* ==================================================== */}
      {showCustomerModal && (
        <div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2C2E]">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white">Quick Add Client</h3>
                  <p class="text-[11px] text-zinc-400">
                    Medusa v2 Registered Client (Auto-Selected)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerModal(false)}
                class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#2C2C2E]"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            {customerFormError && (
              <div class="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {customerFormError}
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    First Name <span class="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.firstName}
                    onInput={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        firstName: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g. Alice"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Last Name <span class="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.lastName}
                    onInput={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        lastName: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="e.g. Wambui"
                    class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Phone Number <span class="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerForm.phone}
                  onInput={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      phone: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="e.g. +254 700 112 233"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Email{" "}
                  <span class="text-[10px] text-zinc-500 font-normal">
                    (Optional - auto-generated fallback)
                  </span>
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onInput={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      email: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="e.g. client@example.com (or leave empty)"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <p class="text-[10px] text-zinc-500 mt-1">
                  If omitted, generates{" "}
                  <span class="font-mono text-zinc-400">
                    walkin_{"{phone}"}@pos.urbandevicecare.co.uk
                  </span>{" "}
                  for Medusa registered constraint.
                </p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Company Name{" "}
                  <span class="text-[10px] text-zinc-500 font-normal">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={customerForm.companyName}
                  onInput={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      companyName: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="e.g. Safari Tech Ltd"
                  class="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-2 pt-3 border-t border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  class="py-2.5 bg-[#2C2C2E] hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  class="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white transition flex items-center justify-center space-x-1.5 shadow"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>
                    {isCreatingCustomer
                      ? "Registering..."
                      : "Register & Auto-Select"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
