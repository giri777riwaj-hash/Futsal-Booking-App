"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import IdentityGate from "./IdentityGate";
import BookingFlow from "./BookingFlow";
import { api } from "@/lib/api";

const STORAGE_KEY = "futsal_identity_user_id";

export default function CustomerApp() {
  const [ground, setGround] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [checkingSaved, setCheckingSaved] = useState(true);

  useEffect(() => {
    api.getGround().then(setGround);
  }, []);

  // restore a previously signed-in identity (guest or account) from this browser
  useEffect(() => {
    const savedId = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setCheckingSaved(false);
      return;
    }
    api
      .getUser(savedId)
      .then(setIdentity)
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setCheckingSaved(false));
  }, []);

  function handleSignedIn(user) {
    setIdentity(user);
    localStorage.setItem(STORAGE_KEY, user.user_id);
  }

  function handleLogout() {
    setIdentity(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateIdentity(user) {
    setIdentity(user);
  }

  return (
    <div className="pitch-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <Header ground={ground} identity={identity} onLogout={handleLogout} />

        <div className="mt-6">
          {checkingSaved ? null : identity ? (
            <BookingFlow ground={ground} identity={identity} setIdentity={updateIdentity} />
          ) : (
            <IdentityGate onSignedIn={handleSignedIn} />
          )}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          PRG 100 class project &middot; Green Kick Futsal, Baneshwor &middot; demo payment
          methods are simulated, not real transactions.
        </p>
      </div>
    </div>
  );
}
