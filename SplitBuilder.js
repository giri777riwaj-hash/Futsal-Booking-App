"use client";

import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";

/**
 * Lets the booker add friends to split the cost with. Equal split across
 * (friends + the booker themself). Purely informational — there's no real
 * payment gateway, so settling a share just means the booker ticks it off
 * after collecting it in person / via their own eSewa-Khalti transfer.
 */
export default function SplitBuilder({ enabled, onToggle, friends, setFriends, totalAmount }) {
  const shareCount = friends.length + 1; // + the booker
  const share = totalAmount / shareCount;

  function addFriend() {
    setFriends((f) => [...f, { friend_name: "", friend_phone: "" }]);
  }
  function updateFriend(i, field, value) {
    setFriends((f) => f.map((fr, idx) => (idx === i ? { ...fr, [field]: value } : fr)));
  }
  function removeFriend(i) {
    setFriends((f) => f.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <Users className="h-4 w-4 text-slate-400" />
        Split this with friends
      </label>

      {enabled && (
        <div className="mt-3 space-y-2">
          {friends.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                placeholder="Friend's name"
                value={f.friend_name}
                onChange={(e) => updateFriend(i, "friend_name", e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                placeholder="Phone (optional)"
                value={f.friend_phone}
                onChange={(e) => updateFriend(i, "friend_phone", e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => removeFriend(i)}
                className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addFriend}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add a friend
          </button>

          <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            NPR {share.toFixed(0)} each &middot; split {shareCount} ways
          </div>
        </div>
      )}
    </div>
  );
}
