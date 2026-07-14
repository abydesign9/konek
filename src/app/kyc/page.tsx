"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface KycStatus {
  tier: number;
  status: string;
  bvnVerified: boolean;
  ninVerified: boolean;
  livenessVerified: boolean;
  duplicateFlag: boolean;
}

const TIERS = [
  { tier: 1, title: "Verify your identity", unlocks: "Fund your wallet, buy airtime, data, bills & eSIM" },
  { tier: 2, title: "Unlock finance", unlocks: "Open a USD account and get a virtual card" },
];

export default function KycPage() {
  const router = useRouter();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [idType, setIdType] = useState<"bvn" | "nin">("bvn");
  const [idValue, setIdValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/kyc/status");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitIdentity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/kyc/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: idType, value: idValue }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Verification failed");
      return;
    }
    setIdValue("");
    setStatus(data);
  }

  async function runLiveness() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/kyc/liveness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Liveness check failed");
      return;
    }
    setStatus(data);
  }

  const tier = status?.tier ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-indigo/10">
        <div className="max-w-lg mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="Konek logo" width={28} height={34} className="mix-blend-multiply" />
            <span className="font-heading text-lg font-bold text-indigo">Konek</span>
          </Link>
          <Link href="/home" className="text-sm text-indigo/60 hover:text-indigo">
            Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="font-heading text-2xl font-bold text-indigo mb-1.5">Verify your account</h1>
        <p className="text-sm text-indigo/60 mb-8">
          A quick check unlocks funding, purchases and — when you&rsquo;re ready — a dollar account.
        </p>

        {/* Tier progress */}
        <div className="flex flex-col gap-3 mb-8">
          {TIERS.map((t) => {
            const done = tier >= t.tier;
            const active = tier === t.tier - 1;
            return (
              <div
                key={t.tier}
                className={`rounded-2xl border p-4 flex items-start gap-3 ${
                  done
                    ? "border-konek-green/30 bg-konek-green/5"
                    : active
                    ? "border-indigo/20 bg-white"
                    : "border-indigo/10 bg-white/50 opacity-70"
                }`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    done ? "bg-konek-green text-white" : "bg-indigo/10 text-indigo"
                  }`}
                >
                  {done ? "✓" : t.tier}
                </div>
                <div>
                  <p className="font-heading font-semibold text-indigo">
                    {t.title}
                    {done && <span className="ml-2 text-xs font-medium text-konek-green">Verified</span>}
                  </p>
                  <p className="text-sm text-indigo/60">{t.unlocks}</p>
                </div>
              </div>
            );
          })}
        </div>

        {status?.duplicateFlag && (
          <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
            Your liveness check matched an existing account and is under review. Contact{" "}
            <a href="mailto:support@konek.app" className="underline">support@konek.app</a> if you think this is a
            mistake.
          </p>
        )}

        {/* Step 1: identity */}
        {tier < 1 && (
          <section className="rounded-2xl bg-white border border-indigo/10 p-6 mb-6">
            <h2 className="font-heading font-semibold text-indigo mb-1">Step 1 · Identity</h2>
            <p className="text-sm text-indigo/60 mb-5">Enter your BVN or NIN. We verify it instantly.</p>
            <div className="flex gap-2 mb-4">
              {(["bvn", "nin"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIdType(t)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold uppercase ${
                    idType === t
                      ? "border-indigo bg-indigo text-white"
                      : "border-indigo/20 bg-white text-indigo/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={submitIdentity} className="flex flex-col gap-3">
              <input
                inputMode="numeric"
                placeholder={`Enter your 11-digit ${idType.toUpperCase()}`}
                value={idValue}
                onChange={(e) => setIdValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
                required
                className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base tracking-wide focus:outline-none focus:ring-2 focus:ring-konek-green"
              />
              <button
                type="submit"
                disabled={busy || idValue.length !== 11}
                className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold hover:bg-indigo/90 transition-colors disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify identity"}
              </button>
            </form>
          </section>
        )}

        {/* Step 2: liveness */}
        {tier >= 1 && tier < 2 && (
          <section className="rounded-2xl bg-white border border-indigo/10 p-6 mb-6">
            <h2 className="font-heading font-semibold text-indigo mb-1">Step 2 · Liveness</h2>
            <p className="text-sm text-indigo/60 mb-5">
              A quick face check confirms it&rsquo;s really you. This unlocks your USD account and card.
            </p>
            <button
              type="button"
              onClick={runLiveness}
              disabled={busy}
              className="w-full rounded-xl bg-konek-green text-white py-3.5 font-semibold hover:bg-konek-green/90 transition-colors disabled:opacity-50"
            >
              {busy ? "Checking…" : "Start liveness check"}
            </button>
          </section>
        )}

        {tier >= 2 && (
          <section className="rounded-2xl bg-konek-green/5 border border-konek-green/30 p-6 mb-6 text-center">
            <p className="font-heading font-semibold text-indigo mb-1">You&rsquo;re fully verified 🎉</p>
            <p className="text-sm text-indigo/60 mb-4">
              Everything is unlocked — including your dollar account and virtual card.
            </p>
            <Link
              href="/home"
              className="inline-block rounded-xl bg-indigo text-white px-6 py-3 font-semibold hover:bg-indigo/90"
            >
              Go to home
            </Link>
          </section>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <p className="text-xs text-indigo/40 text-center mt-6">
          Your details are encrypted and used only to verify your identity. See our{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
