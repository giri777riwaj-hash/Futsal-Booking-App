"use client";

import { Clock, Ban, Unlock, CheckCircle2, Gift } from "lucide-react";

export default function SlotCard({ slot, mode, selected, onSelect, onToggleBlock, busy, freeHighlight }) {
  const isAvailable = slot.status === "available";
  const isBlocked = slot.status === "blocked";
  const isBooked = slot.status === "booked";

  const base = "relative rounded-2xl border p-4 transition-all duration-150 flex flex-col gap-2";

  if (mode === "player") {
    const clickable = isAvailable;
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onSelect(slot)}
        className={[
          base,
          "text-left",
          clickable ? "cursor-pointer hover:border-emerald-400 hover:shadow-md" : "cursor-not-allowed opacity-60",
          selected
            ? "border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500/30"
            : "border-slate-200 bg-white",
        ].join(" ")}
      >
        {selected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" />}
        {freeHighlight && clickable && !selected && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-violet-600">
            <Gift className="h-3.5 w-3.5" /> FREE
          </span>
        )}
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Clock className="h-4 w-4 text-emerald-600" />
          {slot.start_time}–{slot.end_time}
        </div>
        <span className={isAvailable ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-slate-400"}>
          {isAvailable ? "Available" : isBooked ? "Already booked" : "Not available"}
        </span>
      </button>
    );
  }

  // admin mode
  return (
    <div className={[base, "border-slate-200 bg-white"].join(" ")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Clock className="h-4 w-4 text-emerald-600" />
          {slot.start_time}–{slot.end_time}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={[
            "text-xs font-semibold px-2 py-1 rounded-full",
            isAvailable && "bg-emerald-50 text-emerald-700",
            isBooked && "bg-rose-50 text-rose-700",
            isBlocked && "bg-slate-100 text-slate-500",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isAvailable ? "Available" : isBooked ? "Booked" : "Blocked"}
        </span>

        {isBooked ? (
          <span className="text-xs text-slate-400 italic">see All Bookings</span>
        ) : (
          <button
            disabled={busy}
            onClick={() => onToggleBlock(slot, isBlocked ? "available" : "blocked")}
            className={[
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              isBlocked ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-800 text-white hover:bg-slate-900",
              busy && "opacity-50 cursor-wait",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isBlocked ? <Unlock className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
            {isBlocked ? "Unblock" : "Block"}
          </button>
        )}
      </div>
    </div>
  );
}
