"use client";

import Link from "next/link";
import { useState } from "react";
import { IconWallet } from "@/components/icons";

export default function WalletBalanceCard({
  balanceMinor,
}: {
  balanceMinor: number;
}) {
  const [hidden, setHidden] = useState(false);

  return (
    <section className="px-5">
      <div className="konek-hero konek-card-shadow konek-tile rounded-3xl px-6 py-6 text-white">

        <div className="flex items-start justify-between">

          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
              Naira Wallet
            </p>

            <div className="flex items-center gap-3">

              <p className="font-heading text-[2rem] font-bold leading-none">
                {hidden
                  ? "₦••••••••"
                  : `₦${(balanceMinor / 100).toLocaleString()}`}
              </p>

              <button
                type="button"
                onClick={() => setHidden(!hidden)}
                className="rounded-full bg-white/15 px-3 py-1 text-sm"
              >
                {hidden ? "👁" : "🙈"}
              </button>

            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-konek-green/25">
            <IconWallet className="h-6 w-6 text-konek-green" />
          </div>

        </div>

        <Link
          href="/wallet/fund"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-xs font-semibold"
        >
          Fund wallet →
        </Link>

      </div>
    </section>
  );
}
