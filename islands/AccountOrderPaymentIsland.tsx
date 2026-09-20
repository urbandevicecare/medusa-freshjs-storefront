import { useState } from "preact/hooks";
import { CreditCard, Loader2 } from "lucide-preact";
import PaystackCheckout from "./PaystackCheckout.tsx";
import { formatAmount } from "../lib/pricing.ts";

interface AccountOrderPaymentIslandProps {
  orderId: string;
  remainingBalanceRaw: number;
  currencyCode: string;
  paymentProviders?: any[];
}

export default function AccountOrderPaymentIsland({
  orderId,
  remainingBalanceRaw,
  currencyCode,
}: AccountOrderPaymentIslandProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [payAmount, setPayAmount] = useState(remainingBalanceRaw.toString());
  const [paystackSession, setPaystackSession] = useState<
    { accessCode: string } | null
  >(null);

  if (remainingBalanceRaw <= 0) {
    return null;
  }

  const handlePay = async (e: Event) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");

    const amountToSend = payAmount
      ? parseFloat(payAmount)
      : remainingBalanceRaw;

    if (isNaN(amountToSend) || amountToSend <= 0) {
      setError("Please enter a valid amount.");
      setIsProcessing(false);
      return;
    }

    if (amountToSend > remainingBalanceRaw) {
      setError("Amount cannot be greater than the remaining balance.");
      setIsProcessing(false);
      return;
    }

    try {
      // Use the custom payment endpoint which supports partial amounts and defaults to Paystack
      const res = await fetch(`/api/orders/${orderId}/custom-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToSend }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to initialize payment session.");
        setIsProcessing(false);
        return;
      }

      const data = await res.json();
      const accessCode = data.paymentSession?.paystackTxAccessCode ||
        data.paymentSession?.accessCode ||
        data.paymentSession?.access_code;

      if (!accessCode) {
        setError("Failed to initialize Paystack payment. Access code missing.");
        setIsProcessing(false);
        return;
      }

      // Trigger the Paystack popup
      setPaystackSession({ accessCode });
    } catch (err) {
      console.error(err);
      setError("An error occurred during payment initialization.");
      setIsProcessing(false);
    }
  };

  return (
    <div class="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard class="w-5 h-5 text-blue-600" />
          Pay Remaining Balance
        </h3>
      </div>

      {error && (
        <div class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <p class="text-sm text-gray-600 mb-6">
        You have an unpaid balance of{" "}
        <strong class="text-gray-900">
          {formatAmount(remainingBalanceRaw, currencyCode)}
        </strong>.
      </p>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Amount to Pay (Leave blank for full balance)
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm">
              {currencyCode.toUpperCase()}
            </span>
          </div>
          <input
            type="number"
            step="0.01"
            min="1"
            max={remainingBalanceRaw}
            value={payAmount}
            onInput={(e) => setPayAmount((e.target as HTMLInputElement).value)}
            placeholder={remainingBalanceRaw.toString()}
            class="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={isProcessing}
        class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:hover:bg-blue-600"
      >
        {isProcessing
          ? (
            <>
              <Loader2 class="w-5 h-5 animate-spin" />
              Processing...
            </>
          )
          : (
            `Pay ${
              formatAmount(
                payAmount ? parseFloat(payAmount) : remainingBalanceRaw,
                currencyCode,
              )
            }`
          )}
      </button>

      {/* Hidden Paystack popup trigger */}
      {paystackSession && (
        <div class="hidden">
          <PaystackCheckout
            accessCode={paystackSession.accessCode}
            autoTrigger={true}
            onSuccess={() => {
              window.location.reload();
            }}
            onCancel={() => {
              setPaystackSession(null);
              setError("Payment was cancelled.");
              setIsProcessing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
