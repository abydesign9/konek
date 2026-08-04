"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { BANKS } from "@/lib/payout/banks";
import Link from "next/link";

interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
}

const PRESETS_MINOR = [200000, 500000, 1000000, 2000000]; // ₦2k / ₦5k / ₦10k / ₦20k

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function WithdrawPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customNaira, setCustomNaira] = useState("");

  // Add-bank form
  const [adding, setAdding] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingKyc, setCheckingKyc] = useState(true);
  const [kycAllowed, setKycAllowed] = useState(false);
  function loadAccounts() {
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => {
        const list: BankAccount[] = d.accounts ?? [];
        setAccounts(list);
        setSelectedId((cur) => cur ?? list[0]?.id ?? null);
        setAdding(list.length === 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }
  useEffect(loadAccounts, []);

  useEffect(() => {
    fetch("/api/verification/status")
      .then((r) => r.json())
      .then((data) => {
        setKycAllowed(data.tier >= 2);
        setCheckingKyc(false);
      })
      .catch(() => setCheckingKyc(false));
  }, []);
  const amount = useMemo(
    () => amountMinor ?? (customNaira ? Math.round(Number(customNaira) * 100) : null),
    [amountMinor, customNaira]
  );

  async function addBank() {
    if (!bankCode) return setError("Choose your bank");
    if (!/^\d{10}$/.test(accountNumber)) return setError("Enter a valid 10-digit account number");
    setAddBusy(true);
    setError(null);
    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, accountNumber }),
    });
    setAddBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not add that account");
      return;
    }
    setAccounts((prev) => [data, ...prev]);
    setSelectedId(data.id);
    setAdding(false);
    setBankCode("");
    setAccountNumber("");
  }

  function proceed() {
    if (!selectedId) return setError("Choose an account to withdraw to");
    if (!amount || amount < 10000) return setError("Enter at least ₦100");
    setError(null);
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankAccountId: selectedId,
        amountMinor: amount,
        idempotencyKey: crypto.randomUUID(),
        pin: finalPin,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent("/wallet/withdraw")}`);
      return;
    }
    if (redirectIfKycGate(res, data)) return;
    if (res.status === 403) {
      setError("Withdrawals require approved Tier 2 verification.");
      setPin("");
      setShowPin(false);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The bank declined this payout. Your funds were not deducted.");
      setPin("");
      setShowPin(false);
      return;
    }
    const acct = accounts.find((a) => a.id === selectedId);
    setSuccess(
      data.status === "pending"
        ? `${naira(amount ?? 0)} withdrawal is processing to ${acct?.bank_name} ••••${acct?.account_number_last4}.`
        : `${naira(amount ?? 0)} sent to ${acct?.bank_name} ••••${acct?.account_number_last4}.`
    );
    setTimeout(() => router.push("/wallet"), 1400);
  }

  if (checkingKyc) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-indigo/60">Checking verification status...</p>
      </main>
    );
  }

  if (!kycAllowed) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="Withdraw" backHref="/wallet" />
        <div className="max-w-lg mx-auto px-5 py-8">
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
            <h2 className="font-heading font-bold text-indigo mb-2">
              Complete verification first
            </h2>
            <p className="text-sm text-indigo/70 mb-5">
              Withdrawals require approved Tier 2 verification.
            </p>
            <Link
              href="/kyc"
              className="inline-block rounded-xl bg-indigo px-5 py-3 text-white text-sm font-semibold"
            >
              View verification
            </Link>
          </div>
        </div>
      </main>
    );
  }
  if (success) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-heading text-xl font-bold text-indigo mb-1">Withdrawal sent 🎉</h1>
        <p className="text-indigo/60">{success}</p>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {naira(amount ?? 0)} withdrawal
          </h1>
          <p className="text-sm text-indigo/60 mb-8 text-center">Enter your PIN to authorize.</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-sm text-indigo/60 text-center">Processing…</p>}
          {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
          <button
            onClick={() => {
              setShowPin(false);
              setPin("");
            }}
            className="mt-6 text-sm text-indigo/60 underline block mx-auto"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Withdraw" backHref="/wallet" />
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-6">
        <p className="mb-6 text-sm text-indigo/60">
          Move money from your Naira wallet to your own bank account. Withdrawals go only to accounts
          you&apos;ve added and verified — never to anyone else.
        </p>

        <label className="mb-2 block text-sm font-semibold text-indigo">Withdraw to</label>
        {!loaded ? (
          <p className="text-sm text-indigo/40">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {accounts.map((a) => {
              const active = selectedId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active ? "border-konek-green bg-konek-green/10" : "border-indigo/15 bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-indigo">{a.account_name}</p>
                  <p className="text-xs text-indigo/55">
                    {a.bank_name} •••• {a.account_number_last4}
                  </p>
                </button>
              );
            })}

            {adding ? (
              <div className="rounded-2xl border border-indigo/15 bg-white px-4 py-4">
                <label className="mb-1 block text-xs font-semibold text-indigo/50">Bank</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-indigo/20 bg-white px-3 py-2.5 text-sm"
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
                  className="mb-3 w-full rounded-xl border border-indigo/20 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addBank}
                  disabled={addBusy}
                  className="w-full rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addBusy ? "Verifying…" : "Verify & add account"}
                </button>
                {accounts.length > 0 && (
                  <button onClick={() => setAdding(false)} className="mt-2 w-full text-center text-xs text-indigo/50">
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="rounded-2xl border border-dashed border-indigo/25 px-4 py-3 text-sm font-semibold text-indigo/70"
              >
                + Add a bank account
              </button>
            )}
          </div>
        )}

        <label className="mb-2 mt-6 block text-sm font-semibold text-indigo">Amount</label>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS_MINOR.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setAmountMinor(m);
                setCustomNaira("");
              }}
              className={`rounded-xl border py-3.5 font-semibold transition ${
                amountMinor === m ? "border-konek-green bg-konek-green/10 text-indigo" : "border-indigo/20 text-indigo"
              }`}
            >
              {naira(m)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center rounded-xl border border-indigo/15 bg-white px-4 py-3">
          <span className="mr-1 font-heading text-lg font-bold text-indigo/50">₦</span>
          <input
            value={customNaira}
            onChange={(e) => {
              setCustomNaira(e.target.value.replace(/[^\d]/g, ""));
              setAmountMinor(null);
            }}
            inputMode="numeric"
            placeholder="Other amount"
            className="w-full bg-transparent font-heading text-lg font-bold text-indigo placeholder:text-sm placeholder:font-medium placeholder:text-indigo/40 focus:outline-none"
          />
        </div>

        <button
          onClick={proceed}
          disabled={!selectedId || !amount}
          className="mt-8 w-full rounded-2xl bg-indigo px-6 py-3.5 text-center font-semibold text-white disabled:opacity-40"
        >
          Continue
        </button>
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
