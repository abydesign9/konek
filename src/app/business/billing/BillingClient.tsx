"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface FeeEntry {
  id: string;
  kind: string;
  amount_minor: string;
  currency: string;
  description: string;
  created_at: string;
}

function fmt(minor: number | string, currency: string) {
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : "";
  return `${sym}${(Number(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BillingClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [entries, setEntries] = useState<FeeEntry[] | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/business/me").then((r) => r.json()).then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/fee-statement").then((r) => r.json()).then((d) => {
      setEntries(d.entries ?? []);
      setTotals(d.totalsByCurrency ?? {});
    });
  }, []);

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Billing</h1>
        <p className="mt-1 text-sm text-text-secondary">
          raviion has no subscription — you only ever pay per-action fees (like card creation). This is
          every fee charged to your business wallet.
        </p>

        {Object.keys(totals).length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(totals).map(([currency, minor]) => (
              <div key={currency} className="raviion-card-shadow rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold text-indigo/50">{currency} total</p>
                <p className="mt-1 font-heading text-lg font-bold text-indigo">{fmt(minor, currency)}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mb-3 mt-6 text-sm font-bold text-indigo">Fee history</p>
        <div className="raviion-card-shadow divide-y divide-border-soft rounded-2xl bg-white">
          {(entries ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-indigo">{e.description}</p>
                <p className="text-xs text-text-secondary">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-indigo">{fmt(e.amount_minor, e.currency)}</p>
            </div>
          ))}
          {entries !== null && entries.length === 0 && (
            <p className="p-10 text-center text-sm text-text-secondary">No fees charged yet.</p>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
