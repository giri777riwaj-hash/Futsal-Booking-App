"use client";

import { useState } from "react";
import { Loader2, LogIn, UserPlus, User } from "lucide-react";
import { api, errMsg } from "@/lib/api";

const TABS = [
  { key: "login", label: "Log in", icon: LogIn },
  { key: "signup", label: "Create account", icon: UserPlus },
  { key: "guest", label: "Continue as guest", icon: User },
];

export default function IdentityGate({ onSignedIn }) {
  const [tab, setTab] = useState("guest");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res;
      if (tab === "login") {
        res = await api.login({ email: form.email, password: form.password });
      } else if (tab === "signup") {
        res = await api.signup(form);
      } else {
        res = await api.guest({ name: form.name, email: form.email, phone: form.phone });
      }
      onSignedIn(res.user);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm max-w-md mx-auto">
      <h2 className="text-lg font-bold text-slate-800">Who's booking?</h2>
      <p className="text-sm text-slate-500 mt-1">
        Create an account to track your loyalty rewards, or just continue as a guest.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setError(null);
            }}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition ${
              tab === t.key ? "bg-white shadow text-slate-800" : "text-slate-500"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {tab !== "login" && (
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {tab !== "login" && (
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}
        {tab !== "guest" && (
          <input
            type="password"
            placeholder={tab === "signup" ? "Create a password (6+ characters)" : "Password"}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={tab === "signup" ? 6 : undefined}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {tab === "login" ? "Log in" : tab === "signup" ? "Create account" : "Continue"}
        </button>
      </form>

      {tab !== "guest" && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Loyalty rewards (1 free game every 10 bookings) carry over whether you book as a
          guest or with an account, as long as you use the same email.
        </p>
      )}
    </div>
  );
}
