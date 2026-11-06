"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function MockCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params.get("reference");
  const [loading, setLoading] = useState<"approve" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!reference) return;
    setLoading("approve");
    setError(null);
    const res = await fetch("/api/payments/mock/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(`/wallet/fund/success?reference=${reference}`);
  }

  return (
    <div className="w-full max-w-xs rounded-2xl border border-indigo/10 bg-white p-6 shadow-sm">
      <p className="text-xs text-indigo/50 mb-1">Mock Paystack Checkout</p>
      <h1 className="font-heading text-lg font-bold text-indigo mb-6">Confirm payment</h1>
      <p className="text-sm text-indigo/70 mb-6">
        This simulates a card payment for local development. It fires the same
        signed webhook a real Paystack transaction would.
      </p>
      <button
        onClick={approve}
        disabled={loading !== null}
        className="w-full rounded-xl bg-raviion-green text-white py-3 font-semibold mb-3 disabled:opacity-50"
      >
        {loading === "approve" ? "Processing…" : "Approve payment"}
      </button>
      <button
        onClick={() => router.push("/wallet/fund")}
        disabled={loading !== null}
        className="w-full rounded-xl border border-indigo/20 text-indigo py-3 font-semibold disabled:opacity-50"
      >
        Cancel
      </button>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function MockCheckoutClient() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
      <Suspense>
        <MockCheckout />
      </Suspense>
    </main>
  );
}
