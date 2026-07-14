"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "phone" | "code";

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const referralCode = params.get("ref");

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
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
    const data = await res.json().catch(() => ({}));
    setDemoOtp(typeof data.demoOtp === "string" ? data.demoOtp : null);
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, referralCode }),
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
    <main className="min-h-screen bg-background md:grid md:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden md:flex flex-col justify-between bg-indigo relative overflow-hidden p-12">
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-konek-green/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold/20 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3 w-fit">
          <span className="w-11 h-12 rounded-xl bg-white flex items-center justify-center p-1.5">
            <Image src="/brand/logo.png" alt="Konek logo" width={32} height={40} />
          </span>
          <span className="font-heading text-2xl font-bold text-white">Konek</span>
        </Link>

        <div className="relative">
          <h1 className="font-heading text-4xl font-bold text-white leading-tight mb-4">
            One wallet for home and abroad
          </h1>
          <p className="text-white/70 max-w-md">
            Top up family, buy data, get an eSIM, and open a dollar account, all without the risk
            of a money transfer app.
          </p>
        </div>

        <figure className="relative rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-5 max-w-md">
          <blockquote className="text-white/90 text-sm leading-relaxed mb-4">
            &ldquo;I send data to my mum every week now. It lands before we even hang up the
            phone.&rdquo;
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <Image
              src="/brand/avatar_2.png"
              alt="Portrait of Ada O."
              width={36}
              height={36}
              className="rounded-full"
            />
            <div>
              <p className="text-sm font-semibold text-white">Ada O.</p>
              <p className="text-xs text-white/50">London</p>
            </div>
          </figcaption>
        </figure>
      </aside>

      {/* Form panel */}
      <section className="min-h-screen md:min-h-0 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="md:hidden flex items-center gap-2 justify-center mb-10">
            <Image
              src="/brand/logo.png"
              alt="Konek logo"
              width={30}
              height={37}
              className="mix-blend-multiply"
            />
            <span className="font-heading text-xl font-bold text-indigo">Konek</span>
          </Link>

          <h2 className="font-heading text-2xl font-bold text-indigo mb-1.5">
            {step === "phone" ? "Welcome to Konek" : "Check your phone"}
          </h2>
          <p className="text-sm text-indigo/60 mb-8">
            {step === "phone"
              ? "Enter your phone number and we'll send you a code. No password needed."
              : `We sent a 6-digit code to ${phone}.`}
          </p>

          {referralCode && (
            <p className="rounded-xl bg-konek-green/10 border border-konek-green/20 text-konek-green text-sm font-semibold px-4 py-3 mb-6">
              Invited with code {referralCode} — you both earn coins on your first purchase.
            </p>
          )}

          {step === "phone" ? (
            <form onSubmit={requestOtp} className="flex flex-col gap-3">
              <label className="text-sm font-medium text-indigo/70" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="+2348012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo text-white py-3.5 font-semibold hover:bg-indigo/90 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="flex flex-col gap-3">
              {demoOtp && (
                <p className="rounded-xl bg-gold/10 border border-gold/30 text-indigo text-sm px-4 py-3">
                  Demo code: <span className="font-mono font-bold tracking-widest">{demoOtp}</span>
                </p>
              )}
              <label className="text-sm font-medium text-indigo/70" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
                className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-konek-green"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-konek-green text-white py-3.5 font-semibold hover:bg-konek-green/90 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Verifying…" : "Verify & continue"}
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-sm text-indigo/60 underline mt-1"
              >
                Use a different number
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {step === "phone" && (
            <p className="text-sm text-indigo/60 mt-8 text-center">
              New to Konek?{" "}
              <Link
                href={referralCode ? `/signup?ref=${referralCode}` : "/signup"}
                className="text-indigo font-semibold underline"
              >
                Create an account
              </Link>
            </p>
          )}

          <p className="text-xs text-indigo/40 mt-8 text-center">
            No money transfer. No hidden fees. Just the services you actually use.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
