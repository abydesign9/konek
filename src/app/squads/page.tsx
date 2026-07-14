"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Squad {
  id: string;
  name: string;
  member_count: string;
  goal: {
    target_txn_count: number;
    current_txn_count: number;
    fulfilled: boolean;
    reward_desc: string | null;
  } | null;
}

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    fetch("/api/squads")
      .then((res) => res.json())
      .then((data) => setSquads(data.squads ?? []));
  }

  useEffect(load, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    setName("");
    load();
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Squads</h1>
      <p className="text-sm text-indigo/60 mb-6">
        Team up with friends or family — hit 10 purchases together this week for a group reward.
      </p>

      <div className="flex flex-col gap-2 mb-8">
        {squads.map((s) => (
          <div key={s.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-indigo">
              {s.name} <span className="text-indigo/40 font-normal">· {s.member_count} members</span>
            </p>
            {s.goal && (
              <div className="mt-2">
                <div className="w-full h-1.5 rounded-full bg-indigo/10 overflow-hidden mb-1">
                  <div
                    className="h-full bg-konek-green"
                    style={{ width: `${Math.min(100, (s.goal.current_txn_count / s.goal.target_txn_count) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-indigo/50">
                  {s.goal.current_txn_count}/{s.goal.target_txn_count} purchases this week
                  {s.goal.fulfilled && " · 🎉 goal met!"}
                </p>
              </div>
            )}
          </div>
        ))}
        {squads.length === 0 && <p className="text-sm text-indigo/50">You&apos;re not in a squad yet.</p>}
      </div>

      <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Start a squad</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Church group"
            className="flex-1 rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
          />
          <button
            onClick={create}
            disabled={creating}
            className="rounded-xl bg-indigo text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      <Link href="/rewards" className="text-sm text-indigo/60 underline">
        Back to rewards
      </Link>
    </main>
  );
}
