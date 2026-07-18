"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FloatingBadge } from "@/components/FloatingBadge";

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const referralCode = params.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-indigo p-12 md:flex">
        <div aria-hidden className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-konek-green/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />

        <Link href="/" className="relative flex w-fit items-center gap-3">
          <span className="flex h-12 w-11 items-center justify-center rounded-xl bg-white p-1.5">
            <Image src="/brand/logo.png" alt="Konek logo" width={32} height={40} />
          </span>
          <span className="font-heading text-2xl font-bold text-white">Konek</span>
        </Link>

        <div className="relative">
          <div className="relative mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-black/30">
            <Image src="/landing/konek_family_day.jpg" alt="A family checking their Konek app together" fill sizes="400px" className="object-cover" />
            <FloatingBadge icon="📶" className="-left-4 -top-4" size="md" />
            <FloatingBadge icon="💵" className="-right-4 -top-4" delay={0.8} size="md" />
            <FloatingBadge icon="✈️" className="-bottom-4 -right-4" delay={1.6} size="md" />
          </div>
          <h1 className="mb-4 font-heading text-3xl font-bold leading-tight text-white">
            Stay connected. Spend globally. Live without borders.
          </h1>
          <p className="max-w-md text-white/70">
            International top-ups, eSIMs, bill payments, a virtual dollar account, and cards — one platform.
          </p>
        </div>

        <figure className="relative max-w-md rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <blockquote className="mb-4 text-sm leading-relaxed text-white/90">
            &ldquo;I send data to my mum every week now. It lands before we even hang up the phone.&rdquo;
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <Image src="/brand/avatar_2.png" alt="Portrait of Ada O." width={36} height={36} className="rounded-full" />
            <div>
              <p className="text-sm font-semibold text-white">Ada O.</p>
              <p className="text-xs text-white/50">London</p>
            </div>
          </figcaption>
        </figure>
      </aside>

      {/* Form panel */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-12 md:min-h-0">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center justify-center gap-2 md:hidden">
            <Image src="/brand/logo.png" alt="Konek logo" width={30} height={37} className="mix-blend-multiply" />
            <span className="font-heading text-xl font-bold text-indigo">Konek</span>
          </Link>

          <h2 className="mb-1.5 font-heading text-2xl font-bold text-indigo">Welcome back</h2>
          <p className="mb-8 text-sm text-indigo/60">Log in with your email and password.</p>

          {referralCode && (
            <p className="mb-6 rounded-xl border border-konek-green/20 bg-konek-green/10 px-4 py-3 text-sm font-semibold text-konek-green">
              Invited with code {referralCode} — you both earn coins on your first purchase.
            </p>
          )}

          <form onSubmit={login} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-indigo/70" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
            />
            <label className="text-sm font-medium text-indigo/70" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-indigo/50 active:scale-95"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 1-1 2.6-2.7 4M6.1 6.1C4 7.4 3 9.2 3 10c0 2 3 6 8 6a9 9 0 002.9-.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo py-3.5 font-semibold text-white transition-colors hover:bg-indigo/90 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <p className="mt-8 text-center text-sm text-indigo/60">
            New to Konek?{" "}
            <Link href={referralCode ? `/signup?ref=${referralCode}` : "/signup"} className="font-semibold text-indigo underline">
              Create an account
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-indigo/40">
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
