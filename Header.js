"use client";

import { useEffect, useState } from "react";
import { MapPin, CircleDollarSign, Gift, LogOut } from "lucide-react";
import { randomFutsalPhoto } from "@/lib/images";

export default function Header({ ground, identity, onLogout }) {
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    setPhoto(randomFutsalPhoto());
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl text-white shadow-lg shadow-emerald-900/10">
      <div className="absolute inset-0 bg-slate-800">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/90 to-emerald-900/80" />
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Futsal Ground Booking
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
              ⚽ {ground?.name || "Loading…"}
            </h1>
            {ground && (
              <div className="mt-2 flex flex-wrap items-center gap-4 text-emerald-50 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {ground.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CircleDollarSign className="h-4 w-4" />
                  NPR {Number(ground.price_per_hour).toFixed(0)} / hour
                </span>
              </div>
            )}
          </div>

          {identity && (
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="text-sm text-emerald-50">
                Signed in as <strong>{identity.name}</strong>
              </div>
              <div className="flex items-center gap-3">
                {identity.free_games_available > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 text-violet-700 px-3 py-1 text-xs font-bold">
                    <Gift className="h-3.5 w-3.5" />
                    {identity.free_games_available} free game
                    {identity.free_games_available > 1 ? "s" : ""} ready
                  </span>
                )}
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-xs text-emerald-50 underline hover:text-white"
                >
                  <LogOut className="h-3 w-3" /> switch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
