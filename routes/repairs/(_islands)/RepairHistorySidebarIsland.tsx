import { useEffect, useState } from "preact/hooks";

export default function RepairHistorySidebarIsland() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/account/repairs`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          const arr = data.repair_tickets || data.repairs || [];
          arr.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setTickets(arr);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div class="text-sm font-mono text-slate-400 uppercase tracking-widest animate-pulse">
        Loading history...
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div class="text-sm font-serif italic text-slate-500">
        No previous repairs found.
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {tickets.map((t) => (
        <a
          key={t.id}
          href={`/repairs/track?token=${t.approval_token || t.ticket_number}`}
          class="block group border border-slate-200 p-5 hover:border-black transition-colors bg-white hover:shadow-sm"
        >
          <div class="flex justify-between items-start mb-3">
            <span class="font-mono text-xs font-bold text-slate-900 uppercase tracking-widest group-hover:underline">
              {t.ticket_number}
            </span>
            <span class="text-[10px] uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-1 font-bold rounded-sm border border-slate-200">
              {t.status.replace(/_/g, " ")}
            </span>
          </div>
          <div class="text-sm font-medium text-slate-900 mb-1">
            {t.device?.model_name || "Unknown Device"}{" "}
            <span class="text-slate-400 font-normal">
              ({t.device?.brand || "N/A"})
            </span>
          </div>
          <div class="text-xs text-slate-500 font-serif italic line-clamp-2">
            {t.issue_description}
          </div>
          <div class="mt-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            {new Date(t.created_at).toLocaleDateString()}
          </div>
        </a>
      ))}
    </div>
  );
}
