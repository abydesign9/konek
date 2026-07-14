"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RewardEvent {
  kind: string;
  coins: number;
  meta: Record<string, unknown>;
  created_at: string;
}

interface RewardsData {
  coins: number;
  streak: number;
  referralCode: string;
  referralCount: number;
  history: RewardEvent[];
}

const KIND_LABEL: Record<string, string> = {
  coins_earn: "Purchase reward",
  referral: "Referral bonus",
  streak_bonus: "Streak bonus",
  spin: "Spin reward",
  mission: "Mission reward",
};

export default function RewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/rewards")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return <main className="min-h-screen bg-background px-6 py-8" />;
  }

  const referralLink =
    typeof window !== "undefined" ? `${window.location.origin}/login?ref=${data.referralCode}` : "";

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Rewards</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-indigo px-5 py-4 text-white">
          <p className="text-xs text-white/60 mb-1">Coins</p>
          <p className="font-heading text-2xl font-bold">{data.coins}</p>
        </div>
        <div className="rounded-2xl bg-gold/15 px-5 py-4">
          <p className="text-xs text-indigo/60 mb-1">Streak</p>
          <p className="font-heading text-2xl font-bold text-indigo">
            {data.streak} {data.streak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
        <p className="text-sm font-semibold text-indigo mb-1">Invite friends</p>
        <p className="text-xs text-indigo/60 mb-4">
          You and your friend both earn 50 coins when they make their first purchase.
          {data.referralCount > 0 && ` ${data.referralCount} referred so far.`}
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-xs text-indigo/70"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg bg-indigo text-white text-xs font-semibold px-3 py-2 whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <p className="text-sm text-indigo/60 mb-3">History</p>
      <div className="flex flex-col gap-2 mb-8">
        {data.history.length === 0 && <p className="text-sm text-indigo/50">No rewards yet.</p>}
        {data.history.map((event, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3"
          >
            <span className="text-sm text-indigo">{KIND_LABEL[event.kind] ?? event.kind}</span>
            <span className="text-sm font-semibold text-konek-green">+{event.coins} coins</span>
          </div>
        ))}
      </div>

      <Link href="/home" className="text-sm text-indigo/60 underline">
        Back to home
      </Link>
    </main>
  );
}
