"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface IdentityResponse {
  tier?: number;
  status?: string;
  bvnVerified?: boolean;
  ninVerified?: boolean;
  error?: string;
}

export default function BvnVerificationPage() {
  const [bvn, setBvn] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  async function verifyBvn() {
    setError("");

    if (!/^\d{11}$/.test(bvn)) {
      setError("BVN must contain exactly 11 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/kyc/identity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "bvn",
          value: bvn,
        }),
      });

      const data: IdentityResponse = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "BVN verification failed");
        return;
      }

      const identityVerified =
        data.bvnVerified === true ||
        Number(data.tier ?? 0) >= 1;

      if (!identityVerified) {
        setError(
          "The verification provider did not confirm this BVN. Please try again."
        );
        return;
      }

      setVerified(true);
    } catch {
      setError(
        "Could not connect to the verification service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="BVN Verification"
        backHref="/kyc"
      />

      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <p className="text-sm text-indigo/60 mb-3">
            Identity Setup
          </p>

          <div className="h-2 rounded-full bg-indigo/10">
            <div className="h-2 w-1/3 rounded-full bg-indigo" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-indigo/10 p-6">
          {!verified ? (
            <>
              <div className="text-4xl mb-4">
                🏦
              </div>

              <h1 className="text-xl font-bold text-indigo mb-2">
                Verify your BVN
              </h1>

              <p className="text-sm text-indigo/60 mb-4">
                Your Bank Verification Number helps us confirm your identity
                and create your secure Konek wallet.
              </p>

              {/* CBN / fraud reassurance (Plug.ng-style) */}
              <div className="mb-6 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-3 text-xs text-indigo/70">
                <span className="mt-0.5 shrink-0 text-sm">ⓘ</span>
                <span>
                  Submitting your BVN keeps your account secure against fraud and fully compliant with
                  CBN regulations. We never see your bank password or PIN.
                </span>
              </div>

              <label className="block text-sm font-semibold text-indigo mb-2">
                BVN Number
              </label>

              <input
                value={bvn}
                onChange={(e) =>
                  setBvn(e.target.value.replace(/\D/g, ""))
                }
                maxLength={11}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter your 11 digit BVN"
                className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-4 outline-none"
              />

              {error && (
                <p className="text-sm text-red-600 mb-4">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={verifyBvn}
                disabled={loading || bvn.length !== 11}
                className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify BVN"}
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">
                ✅
              </div>

              <h1 className="text-xl font-bold text-indigo mb-2">
                BVN Verified
              </h1>

              <p className="text-sm text-indigo/60 mb-6">
                Your banking identity has been confirmed. You can now access
                your Konek wallet.
              </p>

              <Link
                href="/wallet"
                className="block w-full rounded-xl bg-konek-green text-white text-center py-3 font-semibold"
              >
                Continue to Wallet
              </Link>

              <Link
                href="/kyc/personal-information"
                className="block text-center text-sm text-indigo mt-4"
              >
                Continue KYC Verification
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
