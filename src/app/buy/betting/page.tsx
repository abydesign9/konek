"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipPicker, MonogramBadge } from "@/components/ChipPicker";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { CustomAmountField } from "@/components/CustomAmountField";

const BOOKMAKERS = [
  { id: "sportybet", label: "SportyBet", icon: <MonogramBadge text="SB" className="bg-red-500" /> },
  { id: "bet9ja", label: "Bet9ja", icon: <MonogramBadge text="B9" className="bg-konek-green" /> },
  { id: "betking", label: "BetKing", icon: <MonogramBadge text="BK" className="bg-indigo" /> },
  { id: "1xbet", label: "1xBet", icon: <MonogramBadge text="1x" className="bg-blue-600" /> },
];
const PRESETS_MINOR = [100000, 200000, 500000, 1000000]; // ₦1,000 / ₦2,000 / ₦5,000 / ₦10,000

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

function BuyBetting() {
  const router = useRouter();
  const params = useSearchParams();

  const [bookmaker, setBookmaker] = useState<string | null>(params.get("network"));
  const [accountId, setAccountId] = useState(params.get("phone") ?? "");
  const [amountMinor, setAmountMinor] = useState<number | null>(
    params.get("amountMinor") ? Number(params.get("amountMinor")) : null
  );
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bookmakerLabel = BOOKMAKERS.find((b) => b.id === bookmaker)?.label ?? bookmaker;

  function proceedToPin() {
    if (!bookmaker || accountId.length < 4 || !amountMinor) {
      setError("Choose a bookmaker, enter your account ID, and pick an amount");
      return;
    }
    setError(null);
    setShowPin(true);
  }

  async function submit(finalPin: string) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "betting",
        network: bookmaker,
        phone: accountId,
        amountMinor,
        pin: finalPin,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 428) {
      router.push(`/settings/pin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setPin("");
      setShowPin(false);
      return;
    }
    if (data.status === "failed") {
      setError("The bookmaker declined this top-up. No funds were charged.");
      setPin("");
      setShowPin(false);
      return;
    }

    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${bookmakerLabel} •••• ${accountId.slice(-4)}`,
        serviceType: "betting",
        details: { phone: accountId, network: bookmaker },
      }),
    });

    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-konek-green/15 flex items-center justify-center mb-5">
          <span className="text-konek-green text-3xl">✓</span>
        </div>
        <h1 className="font-heading text-xl font-bold text-indigo mb-2">Wallet funded</h1>
        <p className="text-indigo/60 mb-8">
          {formatNaira(amountMinor ?? 0)} sent to your {bookmakerLabel} account {accountId}.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/home")}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3"
          >
            Back to home
          </button>
          <button
            onClick={() => router.push("/wallet/history")}
            className="rounded-xl border border-indigo/20 bg-white text-indigo font-semibold px-6 py-3"
          >
            View receipt
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1 text-center">
            Confirm {formatNaira(amountMinor ?? 0)} to {bookmakerLabel}
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
      <PageHeader title="Betting" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">Top up your bookmaker wallet in seconds.</p>

      <ChipPicker options={BOOKMAKERS} value={bookmaker} onChange={setBookmaker} />

      <label className="block text-sm text-indigo/60 mb-2">Account / customer ID</label>
      <input
        type="text"
        inputMode="numeric"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        placeholder="e.g. 1234567"
        className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-6 focus:outline-none focus:ring-2 focus:ring-konek-green"
      />

      <label className="block text-sm text-indigo/60 mb-2">Amount</label>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {PRESETS_MINOR.map((minor) => (
          <button
            key={minor}
            type="button"
            onClick={() => setAmountMinor(minor)}
            className={`rounded-xl border py-4 font-semibold transition-colors ${
              amountMinor === minor
                ? "border-konek-green bg-konek-green/10 text-indigo"
                : "border-indigo/20 text-indigo hover:bg-indigo/5"
            }`}
          >
            {formatNaira(minor)}
          </button>
        ))}
      </div>
      <div className="mb-8 -mt-4">
        <CustomAmountField value={amountMinor} onChange={setAmountMinor} presets={PRESETS_MINOR} />
      </div>

      <button
        onClick={proceedToPin}
        className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"
      >
        Fund account
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}

export default function BuyBettingPage() {
  return (
    <Suspense>
      <BuyBetting />
    </Suspense>
  );
}
