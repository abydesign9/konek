"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { IconShield } from "@/components/icons";

interface ProfileData {
  kyc_tier: number;
  kyc_status: string;
}

const TIERS = [
  {
    tier: 1,
    title: "Identity (BVN or NIN)",
    unlocks: "Fund your wallet and buy airtime, data, bills & eSIMs.",
    how: "Enter your BVN or NIN — verified instantly, no document upload.",
  },
  {
    tier: 2,
    title: "Liveness check",
    unlocks: "Open a USD account and create virtual cards.",
    how: "A quick selfie-style face check confirms it's really you.",
  },
];

const STATUS_LABEL: Record<string, string> = {
  none: "Not started",
  pending: "Under review",
  verified: "Verified",
  rejected: "Needs attention",
};

export default function VerificationPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => setProfile(d));
  }, []);

  const tier = profile?.kyc_tier ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Verification" backHref="/profile" />
      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="flex items-start gap-3 rounded-2xl bg-indigo px-5 py-5 text-white">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <IconShield className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-heading text-base font-bold">Why we verify you</p>
            <p className="mt-1 text-sm text-white/80">
              Konek is a licensed financial service. A quick identity check keeps your money safe,
              stops fraud, and is required by law before we can hold funds or issue accounts. We only
              ask for what regulation requires — and your details are encrypted.
            </p>
          </div>
        </div>

        <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-indigo/40">Your levels</p>
        <div className="flex flex-col gap-3">
          {TIERS.map((t) => {
            const done = tier >= t.tier;
            const current = tier === t.tier - 1;
            return (
              <div
                key={t.tier}
                className={`rounded-2xl border bg-white px-5 py-4 konek-card-shadow ${
                  current ? "border-konek-green" : "border-indigo/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done ? "bg-konek-green text-white" : "bg-indigo/10 text-indigo"
                    }`}
                  >
                    {done ? "✓" : t.tier}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-indigo">{t.title}</p>
                    <p className="text-xs text-indigo/55">{t.unlocks}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-indigo/60">{t.how}</p>
              </div>
            );
          })}
        </div>

        {profile && (
          <p className="mt-5 text-center text-xs text-indigo/50">
            Current status: <span className="font-semibold text-indigo">{STATUS_LABEL[profile.kyc_status] ?? profile.kyc_status}</span>
            {" · "}Level {tier}
          </p>
        )}

        <Link
          href="/kyc"
          className="mt-6 block w-full rounded-2xl bg-indigo px-6 py-3.5 text-center font-semibold text-white"
        >
          {tier >= 2 ? "View verification" : tier >= 1 ? "Continue verification" : "Start verification"}
        </Link>
        <p className="mt-3 text-center text-[11px] text-indigo/40">
          Verification is powered by our licensed KYC partner. It usually takes under two minutes.
        </p>
      </div>
    </main>
  );
}
