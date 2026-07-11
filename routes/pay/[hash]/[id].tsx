import { define } from "../../../lib/utils.ts";
import { verifyOrderHash } from "../../../lib/secure-link.ts";
import { CheckCircle2 } from "lucide-preact";
import { STORE_NAME } from "../../../lib/utils.ts";
import PublicOrderPaymentIsland from "../../../islands/PublicOrderPaymentIsland.tsx";
import { getUnifiedOrderNumber } from "../../../lib/order-utils.ts";
import { formatAmount } from "../../../lib/pricing.ts";
import OrderStatusBadge from "../../../islands/OrderStatusBadge.tsx";
import Image from "../../../islands/Image.tsx";
import { medusa } from "../../../lib/sdk.ts";
import { HttpTypes } from "@medusajs/types";
import { page } from "fresh";

export const handler = define.handlers({
  async GET(ctx) {
    const hash = ctx.params.hash;
    const orderId = ctx.params.id;

    // Validate the secure HMAC
    const isValid = await verifyOrderHash(orderId, hash);
    if (!isValid) {
      return new Response("Invalid or expired payment link.", {
        status: 401,
      });
    }

    let order = null;
    try {
      // Public retrieval
      const { order: fetchedOrder } = await medusa.store.order.retrieve(
        orderId,
        {
          fields:
            "*items,*items.variant,*items.variant.product,*shipping_address,*billing_address,*payment_collections,*payment_collections.payments,*payment_collections.payment_sessions",
        },
      );
      order = fetchedOrder;
    } catch (e: unknown) {
      console.error("Failed to fetch public order details", e);
      return new Response("", {
        status: 302,
        headers: { Location: "/" },
      });
    }

    if (!order) {
      return new Response("", {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Fetch payment providers globally/publicly
    let paymentProviders = [];
    try {
      const { payment_providers } = await medusa.store.payment
        .listPaymentProviders({});
      // Filter out providers or customize if needed, or just let island handle fallback
      // Often you might use Deno.env.get("PAYMENT_PROVIDERS") here to sync with Checkout
      const envProviders = Deno.env.get("PAYMENT_PROVIDERS");
      if (envProviders) {
        try {
          const mapped = envProviders.split(",").map((p) => {
            const [id, name] = p.split(":");
            return { id: id.trim(), name: name.trim() };
          });
          paymentProviders = mapped;
        } catch (e) {
          console.error("Error parsing PAYMENT_PROVIDERS from env:", e);
        }
      } else {
        paymentProviders = (payment_providers || []).map((p: any) => {
          let name = p.id;
          if (p.id.includes("manual") || p.id === "pp_system_default") {
            name = "Pay on Delivery (Manual)";
          } else if (p.id.includes("paystack")) {
            name = "Paystack";
          }
          return { id: p.id, name };
        });
      }
    } catch (e) {
      console.error("Failed to fetch payment providers publicly", e);
    }

    ctx.state.order = order;
    ctx.state.paymentProviders = paymentProviders;
    ctx.state.title = `Pay Order #${
      getUnifiedOrderNumber(order)
    } - ${STORE_NAME}`;
    ctx.state.description = `Pay remaining balance for order #${
      getUnifiedOrderNumber(order)
    }.`;

    return page({ order, paymentProviders });
  },
});

export default define.page(function PublicOrderPayPage(props) {
  const { order, paymentProviders } = props.data as {
    order: HttpTypes.StoreOrder;
    paymentProviders: any[];
  };

  const currencyCode = order.currency_code || "USD";
  const subtotal = formatAmount(order.subtotal || 0, currencyCode);
  const shipping = (order.shipping_total || 0) === 0
    ? "Free"
    : formatAmount(order.shipping_total || 0, currencyCode);
  const taxes = formatAmount(order.tax_total || 0, currencyCode);
  const total = formatAmount(order.total || 0, currencyCode);

  let capturedAmountRaw = 0;
  if (order.payment_collections) {
    for (const pc of order.payment_collections) {
      if (pc.payments) {
        capturedAmountRaw += pc.payments.reduce((acc: number, p: any) => {
          const isPaid = !!p.captured_at;
          return acc + (isPaid ? Number(p.amount) : 0);
        }, 0);
      }
    }
  }

  const remainingBalanceRaw = Math.max(
    0,
    (order.total || 0) - capturedAmountRaw,
  );

  return (
    <div class="max-w-4xl mx-auto px-4 py-12 md:py-16">
      <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">
            Order #{getUnifiedOrderNumber(order)}
          </h1>
          <OrderStatusBadge initialOrder={order} />
        </div>

        <div class="space-y-6 mb-8 border-y border-gray-100 py-6">
          {order.items?.map((item: HttpTypes.StoreOrderLineItem) => (
            <div
              key={item.id}
              class="flex items-center gap-4"
            >
              <div class="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 p-1">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  class="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{item.title}</h3>
                {item.variant?.title && (
                  <p class="text-sm text-gray-500">
                    Variant: {item.variant.title}
                  </p>
                )}
              </div>
              <div class="text-right">
                <p class="font-medium text-gray-900">
                  {formatAmount(item.unit_price, currencyCode)}{" "}
                  <span class="text-gray-400 font-normal">
                    x{item.quantity}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="bg-gray-50/50 p-6 rounded-xl border border-gray-100/50">
            <h3 class="font-bold text-gray-900 mb-4 text-lg">Order Summary</h3>
            <div class="space-y-3 text-sm text-gray-600">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span class="font-medium text-gray-900">{subtotal}</span>
              </div>
              <div class="flex justify-between">
                <span>Shipping</span>
                <span class="font-medium text-gray-900">{shipping}</span>
              </div>
              <div class="flex justify-between">
                <span>Taxes</span>
                <span class="font-medium text-gray-900">{taxes}</span>
              </div>
              <div class="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span class="font-bold text-gray-900">Total</span>
                <span class="font-bold text-gray-900 text-xl">{total}</span>
              </div>
              <div class="flex justify-between text-green-600 pt-2">
                <span>Amount Paid</span>
                <span class="font-medium">
                  {formatAmount(capturedAmountRaw, currencyCode)}
                </span>
              </div>
              <div class="flex justify-between text-red-600">
                <span class="font-bold">Remaining Balance</span>
                <span class="font-bold">
                  {formatAmount(remainingBalanceRaw, currencyCode)}
                </span>
              </div>
            </div>
          </div>

          <div>
            {remainingBalanceRaw <= 0
              ? (
                <div class="h-full flex flex-col items-center justify-center bg-green-50 rounded-xl border border-green-100 p-8 text-center space-y-4">
                  <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 class="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-green-800 mb-2">
                      Order Fully Paid!
                    </h3>
                    <p class="text-green-600 text-sm">
                      Thank you! This order has been fully paid. No further
                      action is required.
                    </p>
                  </div>
                </div>
              )
              : (
                <div class="h-full">
                  <PublicOrderPaymentIsland
                    orderId={order.id}
                    remainingBalanceRaw={remainingBalanceRaw}
                    currencyCode={currencyCode}
                    paymentProviders={paymentProviders}
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
});
