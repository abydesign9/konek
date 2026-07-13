"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <h1 className="font-heading text-2xl font-bold text-indigo mb-1">Konek</h1>
      <p className="text-sm text-indigo/70 mb-8">
        {step === "phone" ? "Enter your phone number" : "Enter the code we sent you"}
      </p>

      {step === "phone" ? (
        <form onSubmit={requestOtp} className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="tel"
            inputMode="tel"
            placeholder="+2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-base tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-konek-green"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-konek-green text-white py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="text-sm text-indigo/60 underline"
          >
            Use a different number
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
