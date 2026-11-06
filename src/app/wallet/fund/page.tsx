"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const PRESETS_MINOR = [100000, 200000, 500000, 1000000];

function formatNaira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function FundWalletPage() {
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customNaira, setCustomNaira] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingKyc, setCheckingKyc] = useState(true);
  const [kycAllowed, setKycAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    amountMinor ??
    (customNaira ? Math.round(Number(customNaira) * 100) : null);


  useEffect(() => {
    async function checkKyc() {
      try {
        const res = await fetch("/api/verification/status");

        const data = await res.json();

        setKycAllowed(
          data.bvnVerified === true ||
          data.ninVerified === true ||
          data.tier >= 1
        );

      } catch {
        setKycAllowed(false);
      } finally {
        setCheckingKyc(false);
      }
    }

    checkKyc();
  }, []);



  async function fundWallet() {
    if (!selected || !Number.isInteger(selected) || selected < 10000) {
      setError("Enter at least ₦100");
      return;
    }

    setError(null);
    setLoading(true);

    const idempotencyKey = crypto.randomUUID();

    const res = await fetch("/api/wallet/fund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amountMinor: selected,
        idempotencyKey,
      }),
    });


    setLoading(false);


    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (redirectIfKycGate(res, data)) return;
      setError(data.error ?? "Something went wrong");
      return;
    }


    const data = await res.json();

    window.location.href = data.authorizationUrl;
  }



  if (checkingKyc) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="Fund wallet" backHref="/home" />

        <div className="p-6 text-center text-indigo/60">
          Checking verification status...
        </div>
      </main>
    );
  }



  if (!kycAllowed) {
    return (
      <main className="min-h-screen bg-background">

        <PageHeader title="Fund wallet" backHref="/home" />


        <div className="max-w-lg mx-auto px-5 py-8">

          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">

            <h2 className="font-heading font-bold text-indigo mb-2">
              Verify your account first
            </h2>


            <p className="text-sm text-indigo/70 mb-5">
              You need BVN or NIN verification before you can fund your wallet.
            </p>


            <Link
              href="/kyc"
              className="inline-block rounded-xl bg-indigo px-5 py-3 text-sm font-semibold text-white"
            >
              Complete verification
            </Link>

          </div>

        </div>

      </main>
    );
  }



  return (
    <main className="min-h-screen bg-background">

      <PageHeader title="Fund wallet" backHref="/home" />


      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">


        <p className="text-sm text-indigo/60 mb-8">
          Choose an amount to add to your NGN wallet.
        </p>


        <div className="grid grid-cols-2 gap-3 mb-4">

          {PRESETS_MINOR.map((minor) => (

            <button
              key={minor}
              onClick={() => {
                setAmountMinor(minor);
                setCustomNaira("");
              }}

              className={`rounded-xl border py-4 font-semibold transition-colors ${
                amountMinor === minor
                  ? "border-raviion-green bg-raviion-green/10 text-indigo"
                  : "border-indigo/20 text-indigo hover:bg-indigo/5"
              }`}
            >

              {formatNaira(minor)}

            </button>

          ))}

        </div>



        <label className="block text-sm text-indigo/60 mb-2">
          Or enter a custom amount (₦)
        </label>


        <input
          type="number"
          inputMode="decimal"
          min={100}
          value={customNaira}
          onChange={(e) => {
            setCustomNaira(e.target.value);
            setAmountMinor(null);
          }}
          placeholder="e.g. 1500"
          className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base mb-6"
        />



        <button

          onClick={fundWallet}

          disabled={loading || !selected}

          className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"

        >

          {loading
            ? "Redirecting…"
            : selected
            ? `Fund with ${formatNaira(selected)}`
            : "Fund wallet"}

        </button>



        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}


      </div>

    </main>
  );
}
