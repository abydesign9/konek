"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RewardEvent {
  kind: string;
  coins: number;
  meta: Record<string, unknown>;
  created_at: string;
}

interface Mission {
  code: string;
  title: string;
  coin_reward: number;
  status: string | null;
}

interface RewardsData {
  coins: number;
  dailyStreak: number;
  weeklyStreak: number;
  longestWeeklyStreak: number;
  level: string;
  perkDiscountPct: number;
  referralCode: string;
  referralCount: number;
  missions: Mission[];
  history: RewardEvent[];
}

const KIND_LABEL: Record<string, string> = {
  coins_earn: "Purchase reward",
  referral: "Referral bonus",
  streak_bonus: "Streak bonus",
  spin: "Spin reward",
  mission: "Mission reward",
};

const LEVEL_COLOR: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-700",
  silver: "bg-gray-200 text-gray-700",
  gold: "bg-gold/20 text-gold",
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-indigo">Rewards</h1>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${LEVEL_COLOR[data.level] ?? ""}`}>
          {data.level}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl bg-indigo px-5 py-4 text-white">
          <p className="text-xs text-white/60 mb-1">Coins</p>
          <p className="font-heading text-2xl font-bold">{data.coins}</p>
        </div>
        <div className="rounded-2xl bg-gold/15 px-5 py-4">
          <p className="text-xs text-indigo/60 mb-1">Daily streak</p>
          <p className="font-heading text-2xl font-bold text-indigo">
            {data.dailyStreak} {data.dailyStreak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-8">
        <p className="text-xs text-indigo/60 mb-1">Weekly streak</p>
        <p className="text-sm font-semibold text-indigo">
          {data.weeklyStreak} {data.weeklyStreak === 1 ? "week" : "weeks"} running
          {data.longestWeeklyStreak > data.weeklyStreak && (
            <span className="text-indigo/40"> · best {data.longestWeeklyStreak}</span>
          )}
        </p>
        {data.perkDiscountPct > 0 && (
          <p className="text-xs text-konek-green mt-1">
            {data.level} perk: {(data.perkDiscountPct * 100).toFixed(1)}% off
          </p>
        )}
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

      <p className="text-sm text-indigo/60 mb-3">Missions</p>
      <div className="flex flex-col gap-2 mb-8">
        {data.missions.map((m) => (
          <div
            key={m.code}
            className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3"
          >
            <span className={`text-sm ${m.status ? "text-indigo/40 line-through" : "text-indigo"}`}>
              {m.title}
            </span>
            <span className={`text-xs font-semibold ${m.status ? "text-konek-green" : "text-indigo/50"}`}>
              {m.status ? "✓ done" : `+${m.coin_reward}`}
            </span>
          </div>
        ))}
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

      <div className="flex gap-4">
        <Link href="/squads" className="text-sm text-indigo/60 underline">
          Squads
        </Link>
        <Link href="/home" className="text-sm text-indigo/60 underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
