import { useState } from "preact/hooks";

export default function BookRepairIsland() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [brand, setBrand] = useState("Apple");
  const [modelName, setModelName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [accessories, setAccessories] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/repairs/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: { brand, model_name: modelName, serial_number: serialNumber },
          ticket: {
            issue_description: issueDescription,
            included_accessories: accessories || undefined,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[BookRepairIsland] Failed to book repair:", text);
        let errorMsg = "Failed to submit repair request.";
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.message || parsed.error || errorMsg;
        } catch { /* skip */ }
        throw new Error(errorMsg);
      }

      setSuccess(true);
      window.location.href = "/repairs";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-sans text-lg text-slate-900 placeholder:text-slate-400 transition-shadow";

  if (success) {
    return (
      <div class="p-8 bg-green-50 border border-green-200 rounded-md text-green-800">
        <h3 class="text-xl font-bold tracking-tight mb-2">
          Success!
        </h3>
        <p class="font-serif italic text-green-700">
          Your repair has been booked. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-12">
      {error && (
        <div class="p-6 bg-red-50 border border-red-200 rounded-md text-red-600">
          <p class="font-bold text-xs uppercase tracking-widest mb-1">Error</p>
          <p class="font-serif italic text-sm">{error}</p>
        </div>
      )}

      <div class="space-y-8">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-200">
            Device Information
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Brand
              </label>
              <select
                value={brand}
                onChange={(e) =>
                  setBrand((e.target as HTMLSelectElement).value)}
                class={inputClass}
                required
              >
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Google">Google</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onInput={(e) =>
                  setModelName((e.target as HTMLInputElement).value)}
                placeholder="e.g. iPhone 15 Pro"
                class={inputClass}
                required
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Serial / IMEI
              </label>
              <input
                type="text"
                value={serialNumber}
                onInput={(e) =>
                  setSerialNumber((e.target as HTMLInputElement).value)}
                placeholder="Required for parts lookup"
                class={`${inputClass} font-mono uppercase`}
                required
              />
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-200">
            Issue Details
          </h2>
          <div class="space-y-8">
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Description
              </label>
              <textarea
                value={issueDescription}
                onInput={(e) =>
                  setIssueDescription((e.target as HTMLTextAreaElement).value)}
                rows={4}
                placeholder="Describe the problem in detail..."
                class={`${inputClass} resize-y`}
                required
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Included Accessories (Optional)
              </label>
              <input
                type="text"
                value={accessories}
                onInput={(e) =>
                  setAccessories((e.target as HTMLInputElement).value)}
                placeholder="e.g. Charger, Case"
                class={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div class="pt-8">
        <button
          type="submit"
          disabled={loading}
          class="w-full md:w-auto px-12 py-5 bg-black text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:text-slate-500"
        >
          {loading ? "Submitting..." : "Submit Repair Request"}
        </button>
        <p class="mt-4 text-xs font-serif italic text-slate-500">
          By submitting, you agree to our Terms of Service and authorize
          diagnostics.
        </p>
      </div>
    </form>
  );
}
