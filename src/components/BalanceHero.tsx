"use client";

import { useState } from "react";
import Link from "next/link";

export interface CurrencyBalance {
  currency: "NGN" | "USD" | "GBP" | "EUR";
  flag: string;
  minor: number;
}

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

function fmt(minor: number, currency: string) {
  return `${SYMBOL[currency] ?? ""}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The dashboard balance card: one gradient card that switches between the
// customer's currency wallets (NGN/USD/GBP/EUR), hides the balance on tap, and
// links to accounts and adding money. No transfers — Konek is receive-and-spend.
export function BalanceHero({
  balances,
  walletAllowed,
  streak,
}: {
  balances: CurrencyBalance[];
  walletAllowed: boolean;
  streak: number;
}) {
  const [currency, setCurrency] = useState<string>(balances[0]?.currency ?? "NGN");
  const [hidden, setHidden] = useState(false);
  const active = balances.find((b) => b.currency === currency) ?? balances[0];

  return (
    <div className="konek-hero konek-card-shadow relative overflow-hidden rounded-3xl px-6 py-8 text-white">
      <div className="relative z-10 flex items-center justify-between">
        <button onClick={() => setHidden((h) => !h)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
          {active?.currency} balance <span aria-hidden>{hidden ? "🙈" : "👁"}</span>
        </button>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-3 py-1 text-xs font-semibold text-gold">
            🔥 {streak}-day
          </span>
        )}
      </div>

      <p className="relative z-10 mt-4 font-heading text-[2.6rem] font-bold leading-none tracking-tight">
        {hidden ? "••••••" : fmt(active?.minor ?? 0, active?.currency ?? "NGN")}
      </p>

      <div className="relative z-10 mt-7 grid grid-cols-2 gap-3">
        <Link href="/wallet/dollar-account" className="rounded-2xl bg-white/15 py-3.5 text-center text-sm font-semibold backdrop-blur">
          🏦 Accounts
        </Link>
        <Link href={walletAllowed ? "/wallet/fund" : "/kyc"} className="rounded-2xl bg-white py-3.5 text-center text-sm font-semibold text-indigo">
          {walletAllowed ? "＋ Add money" : "Verify to fund"}
        </Link>
      </div>

      {/* Wallet switcher — doubles as "My Wallets" */}
      <div className="konek-scrollbar-none relative z-10 -mx-1 mt-7 flex gap-2.5 overflow-x-auto px-1">
        {balances.map((b) => {
          const on = b.currency === active?.currency;
          return (
            <button
              key={b.currency}
              onClick={() => setCurrency(b.currency)}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                on ? "bg-white/25 ring-1 ring-white/40" : "bg-white/10"
              }`}
            >
              <span className="text-lg" aria-hidden>{b.flag}</span>
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold text-white/70">{b.currency}</span>
                <span className="block text-sm font-bold tabular-nums">{hidden ? "••••" : fmt(b.minor, b.currency)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
