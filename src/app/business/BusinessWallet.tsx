"use client";

import { useEffect, useState } from "react";

interface Balance {
  currency: "NGN" | "USD" | "GBP" | "EUR";
  minor: number;
}

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
const FLAG: Record<string, string> = { NGN: "🇳🇬", USD: "🇺🇸", GBP: "🇬🇧", EUR: "🇪🇺" };

function fmt(minor: number, currency: string) {
  return `${SYMBOL[currency] ?? ""}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The business's own wallet — a separate ledger from the owner's personal
// wallet. The owner can top it up from their personal wallet (an in-app
// transfer). Dedicated inflow account numbers arrive with the payment provider.
export function BusinessWallet() {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [funding, setFunding] = useState(false);
  const [currency, setCurrency] = useState<Balance["currency"]>("NGN");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/business/accounts")
      .then((r) => r.json())
      .then((d) => {
        setBalances(d.balances ?? []);
        setIsOwner(!!d.isOwner);
      })
      .catch(() => setBalances([]));
  }
  useEffect(load, []);

  async function submitFund() {
    setError(null);
    setMsg(null);
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isInteger(minor) || minor <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/business/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, amountMinor: minor, idempotencyKey: crypto.randomUUID() }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Could not add funds");
      return;
    }
    setMsg(`Added ${fmt(minor, currency)} to your business wallet.`);
    setAmount("");
    setFunding(false);
    load();
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold text-indigo">Business accounts</h2>
        {isOwner && !funding && (
          <button
            onClick={() => { setFunding(true); setMsg(null); setError(null); }}
            className="text-sm font-semibold text-konek-green hover:underline"
          >
            + Add funds
          </button>
        )}
      </div>

      <div className="konek-card-shadow grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 sm:grid-cols-4">
        {(balances ?? []).map((b) => (
          <div key={b.currency} className="rounded-xl bg-indigo/[0.03] p-3">
            <p className="text-xs font-semibold text-indigo/50">
              {FLAG[b.currency]} {b.currency}
            </p>
            <p className="mt-1 font-heading text-lg font-bold tabular-nums text-indigo">{fmt(b.minor, b.currency)}</p>
          </div>
        ))}
        {balances === null && <p className="col-span-full py-4 text-center text-sm text-indigo/40">Loading…</p>}
      </div>

      {msg && <p className="mt-3 rounded-xl bg-konek-green/10 px-4 py-2.5 text-sm font-semibold text-konek-green">{msg}</p>}

      {funding && (
        <div className="konek-card-shadow mt-3 rounded-2xl border border-indigo/10 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-indigo">Move money from your personal wallet</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Balance["currency"])}
              className="rounded-xl border border-indigo/15 px-3 py-2.5 text-sm"
            >
              {(["NGN", "USD", "GBP", "EUR"] as const).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={amount}
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Amount"
              className="min-w-0 flex-1 rounded-xl border border-indigo/15 px-4 py-2.5 text-sm"
            />
            <button
              onClick={submitFund}
              disabled={busy || !amount}
              className="rounded-xl bg-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setFunding(false)} className="px-2 py-2.5 text-sm text-indigo/60">Cancel</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <p className="mt-2 text-xs text-indigo/45">
            Comes out of your personal Konek wallet.
          </p>
        </div>
      )}

      <BusinessReceivingAccounts isOwner={isOwner} />
    </section>
  );
}

interface VirtualAccount {
  id: string;
  currency: "NGN" | "USD";
  account_number: string;
  bank_name: string | null;
  status: string;
}

// Dedicated account numbers external payers can send to directly — the
// business equivalent of a personal Naira/dollar account.
function BusinessReceivingAccounts({ isOwner }: { isOwner: boolean }) {
  const [accounts, setAccounts] = useState<VirtualAccount[] | null>(null);
  const [busyCurrency, setBusyCurrency] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/business/virtual-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }
  useEffect(load, []);

  async function provision(currency: "NGN" | "USD") {
    setError(null);
    setBusyCurrency(currency);
    const res = await fetch("/api/business/virtual-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyCurrency(null);
    if (!res.ok) {
      setError(d.error ?? "Could not open that account");
      return;
    }
    load();
  }

  const have = new Set((accounts ?? []).map((a) => a.currency));

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-indigo">Receiving accounts</p>
      <p className="mb-3 text-xs text-indigo/50">
        Dedicated account numbers so clients and partners can pay the business directly.
      </p>

      <div className="flex flex-col gap-2.5">
        {(accounts ?? []).map((a) => (
          <div key={a.id} className="konek-card-shadow flex items-center justify-between rounded-2xl border border-indigo/10 bg-white px-4 py-3.5">
            <div>
              <p className="text-xs font-semibold text-indigo/50">{FLAG[a.currency]} {a.currency} · {a.bank_name ?? "Konek"}</p>
              <p className="mt-0.5 font-heading text-base font-bold tabular-nums text-indigo">{a.account_number}</p>
            </div>
            <span className="rounded-full bg-konek-green/10 px-2.5 py-1 text-[11px] font-semibold text-konek-green">{a.status}</span>
          </div>
        ))}

        {isOwner &&
          (["NGN", "USD"] as const)
            .filter((c) => !have.has(c))
            .map((c) => (
              <button
                key={c}
                onClick={() => provision(c)}
                disabled={busyCurrency === c}
                className="konek-tile flex items-center justify-between rounded-2xl border border-dashed border-indigo/20 px-4 py-3.5 text-left disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-indigo">
                  {FLAG[c]} Open a {c} receiving account
                </span>
                <span className="text-sm text-konek-green">{busyCurrency === c ? "Opening…" : "Open →"}</span>
              </button>
            ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
