"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "details" | "code";

function Signup() {
  const router = useRouter();
  const params = useSearchParams();
  const referralCode = params.get("ref");

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name, referralCode }),
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
      body: JSON.stringify({ phone, code, name, referralCode, isSignup: true }),
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
            Everything you send home, in one place
          </h1>
          <p className="text-white/70 max-w-md">
            Top up family, buy data, get an eSIM, and open a dollar account, all without the risk
            of a money transfer app.
          </p>
        </div>

        <figure className="relative rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-5 max-w-md">
          <blockquote className="text-white/90 text-sm leading-relaxed mb-4">
            &ldquo;Signed up in under a minute, no card details, no password to remember. Just my
            phone number.&rdquo;
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
            {step === "details" ? "Create your account" : "Check your phone"}
          </h2>
          <p className="text-sm text-indigo/60 mb-8">
            {step === "details"
              ? "Enter your details and we'll send you a code. No password needed."
              : `We sent a 6-digit code to ${phone}.`}
          </p>

          {referralCode && (
            <p className="rounded-xl bg-konek-green/10 border border-konek-green/20 text-konek-green text-sm font-semibold px-4 py-3 mb-6">
              Invited with code {referralCode} — you both earn coins on your first purchase.
            </p>
          )}

          {step === "details" ? (
            <form onSubmit={requestOtp} className="flex flex-col gap-3">
              <label className="text-sm font-medium text-indigo/70" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Ada Obi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
              />

              <label className="text-sm font-medium text-indigo/70 mt-2" htmlFor="phone">
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

              <label className="flex items-start gap-2.5 mt-2 text-xs text-indigo/60 leading-relaxed">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-indigo/30 text-konek-green focus:ring-konek-green"
                />
                <span>
                  I agree to Konek&rsquo;s{" "}
                  <Link href="/terms" className="text-indigo underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-indigo underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

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
                onClick={() => setStep("details")}
                className="text-sm text-indigo/60 underline mt-1"
              >
                Use a different number
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <p className="text-xs text-indigo/40 mt-10 text-center">
            Already have an account?{" "}
            <Link href={referralCode ? `/login?ref=${referralCode}` : "/login"} className="text-indigo underline">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  );
}