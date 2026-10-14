"use client";

import { useEffect, useState } from "react";
import { Lock, Calendar, Loader2, ListChecks, Settings2, Plus, Sparkles, ShieldCheck } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import SlotCard from "./SlotCard";
import StatusBadge from "./StatusBadge";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function PasswordGate({ onVerified }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await api.verifyAdmin(pwd);
      if (res.ok) onVerified(pwd);
      else setError("Incorrect password.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm max-w-sm mx-auto text-center"
    >
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
        <Lock className="h-5 w-5 text-slate-500" />
      </div>
      <h2 className="mt-3 text-lg font-bold text-slate-800">Admin access</h2>
      <p className="text-sm text-slate-500 mt-1">Enter the admin password to continue.</p>
      <input
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="Password"
        className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button
        disabled={checking || !pwd}
        className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {checking && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </button>
    </form>
  );
}

export default function AdminApp() {
  const [ground, setGround] = useState(null);
  const [password, setPassword] = useState(null);
  const [tab, setTab] = useState("manage");
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(todayStr());
  }, []);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busySlot, setBusySlot] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("21:00");
  const [customEnd, setCustomEnd] = useState("22:00");
  const [notice, setNotice] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    api.getGround().then(setGround);
  }, []);

  function loadSlots() {
    if (!ground || !date) return;
    setLoadingSlots(true);
    api
      .getSlots(ground.ground_id, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }

  useEffect(() => {
    if (password) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, ground, date]);

  useEffect(() => {
    if (password && tab === "bookings") {
      setLoadingBookings(true);
      api.getAllBookings(password).then(setBookings).finally(() => setLoadingBookings(false));
    }
  }, [password, tab]);

  if (!password) {
    return (
      <div className="pitch-bg min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Staff area
          </div>
          <PasswordGate onVerified={setPassword} />
        </div>
      </div>
    );
  }

  async function toggleBlock(slot, newStatus) {
    setBusySlot(slot.slot_id);
    try {
      await api.setSlotStatus(slot.slot_id, newStatus, password);
      loadSlots();
    } catch (e) {
      setNotice({ type: "error", text: errMsg(e) });
    } finally {
      setBusySlot(null);
    }
  }

  async function generateDay() {
    const res = await api.generateStandardDay(ground.ground_id, date, password);
    setNotice({ type: "success", text: `Added ${res.added} slot(s) for ${date}.` });
    loadSlots();
  }

  async function addCustomSlot(e) {
    e.preventDefault();
    try {
      await api.addCustomSlot(ground.ground_id, date, customStart, customEnd, password);
      setNotice({ type: "success", text: "Slot added." });
      setShowCustom(false);
      loadSlots();
    } catch (e) {
      setNotice({ type: "error", text: errMsg(e, "Could not add slot — it may already exist.") });
    }
  }

  const available = slots.filter((s) => s.status === "available").length;
  const booked = slots.filter((s) => s.status === "booked").length;
  const blocked = slots.filter((s) => s.status === "blocked").length;

  return (
    <div className="pitch-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-lg">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Staff area — not linked from the customer site
          </div>
          <h1 className="mt-1 text-2xl font-extrabold">{ground?.name || "Loading…"}</h1>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setTab("manage")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "manage" ? "bg-white shadow text-slate-800" : "text-slate-500"
            }`}
          >
            <Settings2 className="h-4 w-4" /> Manage Slots
          </button>
          <button
            onClick={() => setTab("bookings")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "bookings" ? "bg-white shadow text-slate-800" : "text-slate-500"
            }`}
          >
            <ListChecks className="h-4 w-4" /> All Bookings
          </button>
        </div>

        {tab === "manage" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Manage ground availability</h2>
                {slots.length > 0 && (
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-semibold">{available} available</span>
                    <span className="text-rose-500 font-semibold">{booked} booked</span>
                    <span className="text-slate-400 font-semibold">{blocked} blocked</span>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-8 text-center">
                <Sparkles className="h-5 w-5 text-slate-400" />
                <p className="text-sm text-slate-500">No slots exist for this date yet.</p>
                <button
                  onClick={generateDay}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Generate standard day (6 slots)
                </button>
              </div>
            ) : (
              <>
                <p className="mt-3 text-xs text-slate-400">
                  Click Block/Unblock to toggle a slot&apos;s availability. Booked slots can&apos;t be
                  toggled directly — cancel the booking first.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((s) => (
                    <SlotCard key={s.slot_id} slot={s} mode="admin" busy={busySlot === s.slot_id} onToggleBlock={toggleBlock} />
                  ))}
                </div>
                <button onClick={generateDay} className="mt-4 text-sm font-semibold text-emerald-700 hover:underline">
                  + Add the standard day template for this date too
                </button>
              </>
            )}

            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowCustom((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Add a custom slot
              </button>
              {showCustom && (
                <form onSubmit={addCustomSlot} className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-xs text-slate-500">
                    Start
                    <input
                      type="time"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    End
                    <input
                      type="time"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition">
                    Add slot
                  </button>
                </form>
              )}
            </div>

            {notice && (
              <div
                className={`mt-4 rounded-xl p-3 text-sm ${
                  notice.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {notice.text}
              </div>
            )}
          </div>
        )}

        {tab === "bookings" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">All bookings</h2>
            {loadingBookings ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                      <th className="py-2 pr-4">Player</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.booking_id} className="border-b border-slate-50">
                        <td className="py-2.5 pr-4 font-medium text-slate-700">{b.player_name}</td>
                        <td className="py-2.5 pr-4 text-slate-500">{b.slot_date}</td>
                        <td className="py-2.5 pr-4 text-slate-500">
                          {b.start_time}–{b.end_time}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={b.booking_status} />
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500">
                          {b.is_free ? (
                            <StatusBadge status="free_reward" />
                          ) : (
                            <>
                              NPR {Number(b.amount || 0).toFixed(0)} &middot; {b.payment_method} &middot;{" "}
                              <StatusBadge status={b.payment_status} />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
