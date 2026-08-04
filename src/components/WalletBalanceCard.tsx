"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

// Balance hero with the four quick-actions living INSIDE the card (Flyspeed-style
// tab-bar-in-a-card): Add money / Withdraw / History / Earn, so the wallet reads
// as one native module.
function QuickAction({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="konek-tile flex flex-1 flex-col items-center gap-1.5">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg text-white backdrop-blur">
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-white/85">{label}</span>
    </Link>
  );
}

export default function WalletBalanceCard({ balanceMinor }: { balanceMinor: number }) {
  const [hidden, setHidden] = useState(false);

  return (
    <section className="px-5">
      <div className="konek-hero konek-card-shadow rounded-3xl px-6 pb-5 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
              Naira Wallet
              <button
                type="button"
                onClick={() => setHidden((h) => !h)}
                aria-label={hidden ? "Show balance" : "Hide balance"}
                className="text-sm"
              >
                {hidden ? "👁" : "🙈"}
              </button>
            </p>
            <p className="font-heading text-[2.1rem] font-bold leading-none">
              {hidden ? "₦••••••" : `₦${(balanceMinor / 100).toLocaleString()}`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-stretch justify-between gap-1">
          <QuickAction href="/wallet/fund" label="Add money" icon="+" />
          <QuickAction href="/wallet/withdraw" label="Withdraw" icon="🏦" />
          <QuickAction href="/wallet/history" label="History" icon="🕘" />
          <QuickAction href="/invite" label="Earn" icon="🎁" />
        </div>
      </div>
    </section>
  );
}
