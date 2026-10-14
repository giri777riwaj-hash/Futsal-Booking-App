"use client";

import { useEffect, useState } from "react";
import {
  Calendar, Wallet, Loader2, Ticket, CalendarDays, AlertCircle, Gift, Share2, Check,
} from "lucide-react";
import { api, errMsg } from "@/lib/api";
import SlotCard from "./SlotCard";
import StatusBadge from "./StatusBadge";
import SplitBuilder from "./SplitBuilder";

const PAYMENT_METHODS = [
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "cash", label: "Cash at venue" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function whatsappLink(phone, message) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "977" + digits; // assume Nepal if no country code
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export default function BookingFlow({ ground, identity, setIdentity }) {
  const [tab, setTab] = useState("book");
  const [date, setDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("esewa");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const [useFreeGame, setUseFreeGame] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [friends, setFriends] = useState([]);

  const [myBookings, setMyBookings] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [openSplits, setOpenSplits] = useState({}); // booking_id -> splits[]

  useEffect(() => {
    setDate(todayStr());
    setMaxDate(new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!identity || !ground || !date) return;
    setLoadingSlots(true);
    setSelected(null);
    api
      .getSlots(ground.ground_id, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [identity, ground, date]);

  function refreshMine(playerId) {
    setLoadingMine(true);
    api
      .getPlayerBookings(playerId)
      .then(setMyBookings)
      .finally(() => setLoadingMine(false));
  }

  useEffect(() => {
    if (identity?.user_id) refreshMine(identity.user_id);
  }, [identity?.user_id, tab]);

  if (!identity) return null;

  const hasFreeGame = identity.free_games_available > 0;

  async function confirmBooking() {
    if (!selected) return;
    setBooking(true);
    setMessage(null);
    try {
      const splitsPayload =
        splitEnabled && friends.some((f) => f.friend_name.trim())
          ? friends
              .filter((f) => f.friend_name.trim())
              .map((f) => ({
                ...f,
                share_amount: ground.price_per_hour / (friends.length + 1),
              }))
          : [];

      const payload = {
        player_id: identity.user_id,
        slot_id: selected.slot_id,
        method,
        use_free_game: useFreeGame && hasFreeGame,
        splits: splitsPayload,
      };
      const res = await api.createBooking(payload);
      setIdentity({ ...identity, ...res.user });
      setLastResult({ ...res, splits: splitsPayload, slot: selected });
      setMessage({
        type: "success",
        text: res.reward_just_earned
          ? `Booked! Your booking ID is #${res.booking_id}. 🎉 You just earned a free game — it's ready for your next booking!`
          : `Booked! Your booking ID is #${res.booking_id}. See you on the pitch 🥅`,
      });
      setSelected(null);
      setUseFreeGame(false);
      setSplitEnabled(false);
      setFriends([]);
      api.getSlots(ground.ground_id, date).then(setSlots);
      refreshMine(res.user.user_id);
    } catch (e) {
      setMessage({ type: "error", text: errMsg(e) });
    } finally {
      setBooking(false);
    }
  }

  async function cancel(bookingId) {
    await api.cancelBooking(bookingId);
    refreshMine(identity.user_id);
  }

  async function toggleSplits(bookingId) {
    if (openSplits[bookingId]) {
      setOpenSplits((s) => ({ ...s, [bookingId]: null }));
      return;
    }
    const splits = await api.getSplits(bookingId);
    setOpenSplits((s) => ({ ...s, [bookingId]: splits }));
  }

  async function settleSplit(bookingId, splitId) {
    await api.settleSplit(splitId);
    const splits = await api.getSplits(bookingId);
    setOpenSplits((s) => ({ ...s, [bookingId]: splits }));
  }

  const effectiveAmount = useFreeGame && hasFreeGame ? 0 : ground.price_per_hour;
  const shareCount = friends.length + 1;
  const shareAmount = effectiveAmount / shareCount;

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("book")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "book" ? "bg-white shadow text-slate-800" : "text-slate-500"
          }`}
        >
          <CalendarDays className="h-4 w-4" /> Book a Slot
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "mine" ? "bg-white shadow text-slate-800" : "text-slate-500"
          }`}
        >
          <Ticket className="h-4 w-4" /> My Bookings
        </button>
      </div>

      {tab === "book" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h2 className="text-lg font-bold text-slate-800">Available slots</h2>
            <label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                min={todayStr()}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          {identity.loyalty_count > 0 && !hasFreeGame && (
            <p className="mt-3 text-xs text-violet-600 font-medium">
              {identity.loyalty_count}/10 bookings toward your next free game.
            </p>
          )}

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : slots.filter((s) => s.status === "available").length === 0 ? (
            <div className="mt-6 rounded-xl bg-amber-50 text-amber-700 text-sm p-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> No available slots for this date. Try another date.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map((s) => (
                <SlotCard
                  key={s.slot_id}
                  slot={s}
                  mode="player"
                  selected={selected?.slot_id === s.slot_id}
                  onSelect={setSelected}
                  freeHighlight={hasFreeGame}
                />
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <div className="text-sm text-emerald-700 font-semibold">
                    {selected.start_time}–{selected.end_time} on {date}
                  </div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    Amount due: NPR {effectiveAmount.toFixed(0)}
                    {splitEnabled && friends.some((f) => f.friend_name.trim()) && (
                      <> &middot; NPR {shareAmount.toFixed(0)} your share</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!useFreeGame && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Wallet className="h-4 w-4" />
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    disabled={booking}
                    onClick={confirmBooking}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {booking && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Booking
                  </button>
                </div>
              </div>

              {hasFreeGame && (
                <label className="flex items-center gap-2 text-sm font-semibold text-violet-700 bg-violet-50 rounded-2xl border border-violet-200 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFreeGame}
                    onChange={(e) => setUseFreeGame(e.target.checked)}
                    className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                  />
                  <Gift className="h-4 w-4" />
                  Use a free game reward for this booking (you have {identity.free_games_available})
                </label>
              )}

              {!useFreeGame && (
                <SplitBuilder
                  enabled={splitEnabled}
                  onToggle={setSplitEnabled}
                  friends={friends}
                  setFriends={setFriends}
                  totalAmount={ground.price_per_hour}
                />
              )}
            </div>
          )}

          {message && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {lastResult?.splits?.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Share2 className="h-4 w-4" /> Send payment requests
              </div>
              <div className="space-y-2">
                {lastResult.splits.map((f, i) => {
                  const text = `Hey ${f.friend_name}! Your share for futsal at ${ground.name} on ${date} (${lastResult.slot.start_time}-${lastResult.slot.end_time}) is NPR ${shareAmount.toFixed(
                    0
                  )}. Send whenever you can 🙏`;
                  return (
                    <a
                      key={i}
                      href={whatsappLink(f.friend_phone, text)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100 transition"
                    >
                      <span className="font-medium text-slate-700">{f.friend_name}</span>
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        Send on WhatsApp <Share2 className="h-3.5 w-3.5" />
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">My bookings</h2>
          {loadingMine ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : myBookings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Make your first booking to see it here.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {myBookings.map((b) => (
                <div key={b.booking_id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {b.slot_date} &middot; {b.start_time}–{b.end_time}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        {b.is_free ? (
                          <StatusBadge status="free_reward" />
                        ) : (
                          <>
                            NPR {Number(b.amount).toFixed(0)} via {b.method}
                            <StatusBadge status={b.payment_status} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      {b.status === "confirmed" && (
                        <button
                          onClick={() => cancel(b.booking_id)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => toggleSplits(b.booking_id)}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Split
                      </button>
                    </div>
                  </div>

                  {openSplits[b.booking_id] && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                      {openSplits[b.booking_id].length === 0 ? (
                        <p className="text-xs text-slate-400">No split set up for this booking.</p>
                      ) : (
                        openSplits[b.booking_id].map((s) => (
                          <div key={s.split_id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">
                              {s.friend_name} &middot; NPR {Number(s.share_amount).toFixed(0)}
                            </span>
                            {s.is_settled ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <Check className="h-3 w-3" /> Settled
                              </span>
                            ) : (
                              <button
                                onClick={() => settleSplit(b.booking_id, s.split_id)}
                                className="text-slate-500 hover:text-emerald-700 hover:underline"
                              >
                                Mark settled
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
