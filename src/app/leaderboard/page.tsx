"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Row {
  rank: number;
  score_minor: string;
  phone: string;
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `•••${phone.slice(-4)}` : phone;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => setRows(data.leaderboard ?? []));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Leaderboard" backHref="/rewards" backLabel="Rewards" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-indigo/60 mb-6">
          Top spenders this week. Rankings refresh weekly — top finishers earn bonus coins.
        </p>

        {rows === null && <p className="text-sm text-indigo/50">Loading…</p>}
        {rows !== null && rows.length === 0 && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-6 text-center">
            <p className="text-sm text-indigo/60">No leaderboard yet — check back once this week&rsquo;s snapshot runs.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {rows?.map((r) => (
            <div
              key={r.rank}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                r.rank <= 3 ? "border-gold/40 bg-gold/10" : "border-indigo/10 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 shrink-0 text-center font-heading font-bold text-indigo">
                  {MEDAL[r.rank] ?? r.rank}
                </span>
                <span className="text-sm font-medium text-indigo truncate">{maskPhone(r.phone)}</span>
              </div>
              <span className="text-sm font-semibold text-indigo shrink-0 ml-3">
                ₦{(Number(r.score_minor) / 100).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
