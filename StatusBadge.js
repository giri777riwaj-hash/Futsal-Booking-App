"use client";

const STYLES = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  booked: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blocked: "bg-slate-100 text-slate-500 ring-slate-500/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  refunded: "bg-amber-50 text-amber-700 ring-amber-600/20",
  free_reward: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const LABELS = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  paid: "Paid",
  refunded: "Refunded",
  free_reward: "Free reward",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || "bg-slate-100 text-slate-500 ring-slate-500/20";
  const label = LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
