"use client";

import Link from "next/link";

export function GlobalAccountCard({
  currency,
  balanceMinor,
  status,
}: {
  currency: string;
  balanceMinor: number;
  status: string;
}) {
  const config: Record<string, { flag: string; symbol: string }> = {
    USD: { flag: "🇺🇸", symbol: "$" },
    GBP: { flag: "🇬🇧", symbol: "£" },
    EUR: { flag: "🇪🇺", symbol: "€" },
  };

  const item = config[currency] ?? { flag: "🌍", symbol: "" };

  return (
    <div className="rounded-2xl border border-indigo/10 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-heading font-bold text-indigo">
            {item.flag} {currency} Account
          </p>
          <p className="text-xs text-indigo/50 capitalize">
            {status}
          </p>
        </div>

        <p className="text-xl font-bold text-indigo">
          {item.symbol}
          {(balanceMinor / 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>

      <Link
        href={`/wallet/global-account/${currency}`}
        className="block text-center rounded-xl bg-indigo text-white py-3 font-semibold"
      >
        View Account →
      </Link>
    </div>
  );
}
