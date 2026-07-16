"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FloatingBadge } from "@/components/FloatingBadge";

const MIN_PASSWORD_LENGTH = 8;

function Signup() {
  const router = useRouter();
  const params = useSearchParams();
  const referralCode = params.get("ref");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, referralCode }),
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
          <div className="relative mb-8 aspect-[2000/1125] w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-black/40">
            <Image
              src="/landing/konek_hero_image.jpg"
              alt="The Konek app connecting a phone to family, money, travel, bills, eSIM and card"
              fill
              sizes="400px"
              className="object-cover"
            />
            <FloatingBadge icon="📶" className="-left-4 -top-4" size="md" />
            <FloatingBadge icon="👨‍👩‍👧" className="-right-4 top-6" delay={0.7} size="md" />
            <FloatingBadge icon="💳" className="-bottom-4 -left-4" delay={1.4} size="md" />
          </div>
          <h1 className="mb-4 font-heading text-4xl font-bold leading-tight text-white">
            Everything you send home, in one place
          </h1>
          <p className="max-w-md text-white/70">
            Top up family, buy data, get an eSIM, and open a dollar account, all without the risk of a money
            transfer app.
          </p>
        </div>

        <figure className="relative max-w-md rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <blockquote className="mb-4 text-sm leading-relaxed text-white/90">
            &ldquo;I landed in Dubai and had data before I left the airport. That is the whole point.&rdquo;
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <Image src="/brand/avatar_4.png" alt="Portrait of Bola A." width={36} height={36} className="rounded-full" />
            <div>
              <p className="text-sm font-semibold text-white">Bola A.</p>
              <p className="text-xs text-white/50">Dubai</p>
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

          <h2 className="mb-1.5 font-heading text-2xl font-bold text-indigo">Create your account</h2>
          <p className="mb-8 text-sm text-indigo/60">Your full name, email, and a password is all it takes.</p>

          {referralCode && (
            <p className="mb-6 rounded-xl border border-konek-green/20 bg-konek-green/10 px-4 py-3 text-sm font-semibold text-konek-green">
              Invited with code {referralCode} — you both earn coins on your first purchase.
            </p>
          )}

          <form onSubmit={signUp} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-indigo/70" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Ada Obi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
            />

            <label className="mt-2 text-sm font-medium text-indigo/70" htmlFor="email">
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

            <label className="mt-2 text-sm font-medium text-indigo/70" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full rounded-xl border border-indigo/20 bg-white px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-konek-green"
            />
            {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
              <p className="text-xs text-gold">{MIN_PASSWORD_LENGTH - password.length} more character(s) needed</p>
            )}

            <label className="mt-2 flex items-start gap-2.5 text-xs leading-relaxed text-indigo/60">
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
              className="mt-2 w-full rounded-xl bg-indigo py-3.5 font-semibold text-white transition-colors hover:bg-indigo/90 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create Free Account"}
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <p className="mt-10 text-center text-xs text-indigo/40">
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
