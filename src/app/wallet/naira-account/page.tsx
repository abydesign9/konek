"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

interface Account {
  id: string;
  accountNumber: string;
  bankName: string | null;
  status: string;
}

export default function NairaAccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    fetch("/api/virtual-account/naira")
      .then((r) => r.json())
      .then((d) => setAccount(d.account ?? null))
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/virtual-account/naira", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 403 && d.code === "kyc_required") {
      router.push("/kyc");
      return;
    }
    if (!res.ok) {
      setError(d.error ?? "Could not create your account");
      return;
    }
    setAccount(d.account ?? null);
  }

  function copy() {
    if (!account) return;
    navigator.clipboard?.writeText(account.accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Naira Account" backHref="/wallet" />

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="mb-6 rounded-3xl bg-indigo p-6 text-white">
          <p className="text-sm text-white/60">Your Konek Naira account</p>
          <h1 className="mt-1 text-xl font-bold">Get paid directly to your wallet</h1>
          <p className="mt-2 text-sm text-white/70">
            Share this account number. Any transfer to it lands in your Konek wallet instantly.
          </p>
        </div>

        {!loaded ? (
          <div className="h-32 animate-pulse rounded-3xl bg-indigo/5" />
        ) : account ? (
          <div className="rounded-3xl border border-indigo/10 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo/40">{account.bankName ?? "Bank"}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-heading text-3xl font-bold tracking-wider text-indigo">{account.accountNumber}</p>
              <button onClick={copy} className="rounded-xl bg-indigo/10 px-3 py-2 text-xs font-semibold text-indigo">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-sm text-indigo/55">
              Transfers to this account are free and credit your wallet automatically. Receive only.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-indigo/10 bg-white p-6 text-center">
            <div className="mb-3 text-4xl">🏦</div>
            <p className="font-semibold text-indigo">Create your Naira account</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-indigo/55">
              A dedicated account number so anyone can pay you, and it lands in your wallet instantly.
            </p>
            <button
              onClick={create}
              disabled={busy}
              className="mt-5 rounded-xl bg-indigo px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
