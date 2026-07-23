"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { BANKS } from "@/lib/payout/banks";

interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
  verified: boolean;
}

export default function PayoutAccountPage() {
  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        setAdding((d.accounts ?? []).length === 0);
      })
      .catch(() => setAccounts([]));
  }
  useEffect(load, []);

  async function addBank() {
    if (!bankCode) return setError("Choose your bank");
    if (!/^\d{10}$/.test(accountNumber)) return setError("Enter a valid 10-digit account number");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, accountNumber }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not add that account");
      return;
    }
    setBankCode("");
    setAccountNumber("");
    setAdding(false);
    load();
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Payout account" backHref="/profile" />
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="mb-5 text-sm text-indigo/60">
          The bank account you withdraw your Konek balance to. Only accounts you&rsquo;ve added and
          verified can receive payouts — never anyone else&rsquo;s.
        </p>

        {accounts === null ? (
          <div className="animate-pulse space-y-2">
            <div className="h-20 rounded-2xl bg-indigo/5" />
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-indigo/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-indigo">{a.account_name}</p>
                  {a.verified && (
                    <span className="rounded-full bg-konek-green/15 px-2.5 py-1 text-[11px] font-semibold text-konek-green">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-indigo/55">
                  {a.bank_name} •••• {a.account_number_last4}
                </p>
              </div>
            ))}

            {adding ? (
              <div className="rounded-2xl border border-indigo/15 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-indigo">Add a payout account</p>
                <label className="mb-1 block text-xs font-semibold text-indigo/50">Bank</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-indigo/20 bg-white px-3 py-3 text-sm"
                >
                  <option value="">Select your bank</option>
                  {BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <label className="mb-1 block text-xs font-semibold text-indigo/50">Account number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  inputMode="numeric"
                  placeholder="0123456789"
                  className="mb-3 w-full rounded-xl border border-indigo/20 px-3 py-3 text-sm"
                />
                <button
                  onClick={addBank}
                  disabled={busy}
                  className="w-full rounded-xl bg-indigo px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Verifying…" : "Verify & add account"}
                </button>
                {accounts.length > 0 && (
                  <button onClick={() => setAdding(false)} className="mt-2 w-full text-center text-xs text-indigo/50">
                    Cancel
                  </button>
                )}
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full rounded-2xl border border-dashed border-indigo/25 px-4 py-3 text-sm font-semibold text-indigo/70"
              >
                + Add a payout account
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
