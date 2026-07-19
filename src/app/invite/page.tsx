"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface RewardsData {
  referralCode: string;
  referralCount: number;
}

const STEPS = [
  { n: "1", t: "Share your link", d: "Send your invite to friends and family." },
  { n: "2", t: "They join & transact", d: "They sign up and spend $100 or more on Konek." },
  { n: "3", t: "You earn $10", d: "Paid as wallet credit at today's rate — spend it on any Konek service." },
];

export default function InvitePage() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/rewards")
      .then((res) => res.json())
      .then((d) => setData({ referralCode: d.referralCode, referralCount: d.referralCount ?? 0 }))
      .catch(() => setData(null));
  }, []);

  const link =
    data && typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${data.referralCode}` : "";
  const shareText = `Join me on Konek for airtime, data, bills, eSIMs and a USD account. Use my link and we both win: ${link}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on Konek", text: shareText, url: link });
        return;
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Invite friends" backHref="/rewards" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-2xl bg-gradient-to-r from-konek-green to-indigo px-5 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Referral rewards</p>
          <p className="mt-1 font-heading text-2xl font-bold leading-tight">Earn $10 per friend</p>
          <p className="mt-1 text-sm text-white/85">
            For every friend who joins with your link and transacts $100 or more.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-konek-green/15 text-sm font-bold text-konek-green">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-indigo">{s.t}</p>
                <p className="text-xs text-indigo/55">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {data && data.referralCount > 0 && (
          <p className="mt-6 text-sm text-indigo/60">
            <span className="font-semibold text-indigo">{data.referralCount}</span> friend
            {data.referralCount === 1 ? "" : "s"} referred so far.
          </p>
        )}

        <div className="mt-6">
          <label className="block text-xs text-indigo/60 mb-2">Your invite link</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-xl border border-indigo/20 px-3 py-2.5 text-xs text-indigo/70"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-xl border border-indigo/20 px-3 py-2.5 text-xs font-semibold text-indigo whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <button
          onClick={share}
          disabled={!link}
          className="mt-4 w-full rounded-xl bg-indigo px-6 py-3.5 text-center font-semibold text-white disabled:opacity-40"
        >
          Share invite link
        </button>

        <p className="mt-4 text-center text-xs text-indigo/40">
          Rewards are paid as Konek wallet credit and can be spent on any service.
        </p>
      </div>
    </main>
  );
}
