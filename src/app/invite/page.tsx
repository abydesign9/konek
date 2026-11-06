"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Friend {
  name: string;
  joinedAt: string;
  status: string; // pending | qualified | paid
  rewardMinor: number;
}

interface ReferralData {
  referralCode: string | null;
  referralHandle: string | null;
  hasUsername: boolean;
  referralCount: number;
  earnedMinor: number;
  friends: Friend[];
}

const FRIEND_STATUS: Record<string, string> = {
  pending: "Signed up — not transacted yet",
  qualified: "Transacting — almost there",
  paid: "Reward paid",
};

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function InvitePage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/me")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() =>
        setData({ referralCode: null, referralHandle: null, hasUsername: false, referralCount: 0, earnedMinor: 0, friends: [] })
      );
  }, []);

  // Default the link to the username (readable) — falls back to the code.
  const handle = data?.referralHandle ?? data?.referralCode ?? null;
  const inviteLink =
    handle && typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${handle}` : "";
  const shareText = `Join me on raviion for airtime, data, bills, eSIMs and a USD account: ${inviteLink}`;

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on raviion", text: shareText, url: inviteLink });
        return;
      } catch {
        // dismissed — fall through to copy
      }
    }
    copyLink();
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <PageHeader title="Invite & Earn" backHref="/home" />
        <div className="mx-auto max-w-lg animate-pulse px-5 py-6">
          <div className="mb-5 h-36 rounded-3xl bg-indigo/10" />
          <div className="mb-5 h-40 rounded-3xl bg-indigo/5" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-indigo/5" />
            <div className="h-24 rounded-2xl bg-indigo/5" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Invite & Earn" backHref="/home" />

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="mb-5 rounded-3xl bg-indigo p-6 text-white">
          <p className="text-sm text-white/60">{data.hasUsername ? "Your referral handle" : "Your referral code"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-wide">{data.hasUsername ? `@${handle}` : handle ?? "—"}</h1>
          <p className="mt-3 text-sm text-white/70">
            Earn <span className="font-semibold text-raviion-green">$10</span> for every friend who joins
            with your link and transacts $100 or more.
          </p>
          {!data.hasUsername && (
            <Link href="/profile/account" className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
              Set a username for a readable link →
            </Link>
          )}
        </div>

        <div className="mb-5 rounded-3xl border border-indigo/10 bg-white p-5">
          <h2 className="mb-4 font-bold text-indigo">Share your invite</h2>
          <div className="mb-4 break-all rounded-xl bg-indigo/5 p-3 text-sm text-indigo/70">
            {inviteLink || "Your invite link appears here"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyLink}
              disabled={!inviteLink}
              className="rounded-xl border border-indigo/20 py-3 font-semibold text-indigo disabled:opacity-40"
            >
              {copied ? "Copied ✅" : "Copy Link"}
            </button>
            <button
              onClick={share}
              disabled={!inviteLink}
              className="rounded-xl bg-indigo py-3 font-semibold text-white disabled:opacity-40"
            >
              Share
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-indigo/10 bg-white p-4">
            <p className="text-xs text-indigo/50">Friends referred</p>
            <p className="mt-2 text-2xl font-bold text-indigo">{data.referralCount}</p>
          </div>
          <div className="rounded-2xl border border-indigo/10 bg-white p-4">
            <p className="text-xs text-indigo/50">Rewards earned</p>
            <p className="mt-2 text-2xl font-bold text-raviion-green">{naira(data.earnedMinor)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-indigo/10 bg-white p-5">
          <h2 className="mb-4 font-bold text-indigo">Referral history</h2>
          {data.friends.length === 0 ? (
            <p className="text-sm text-indigo/50">
              No referrals yet — share your link and your friends will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.friends.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-indigo/5 p-3">
                  <div>
                    <p className="font-semibold text-indigo">{f.name}</p>
                    <p className="text-xs text-indigo/60">{FRIEND_STATUS[f.status] ?? f.status}</p>
                  </div>
                  <p className={`font-bold ${f.status === "paid" ? "text-raviion-green" : "text-indigo/40"}`}>
                    {f.status === "paid" ? `+${naira(f.rewardMinor)}` : "Pending"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl bg-indigo/5 p-5">
          <h3 className="font-bold text-indigo">How rewards work</h3>
          <p className="mt-2 text-sm text-indigo/60">
            Share your link → your friend joins raviion → they spend $100 or more → you get $10 as wallet
            credit at today&apos;s rate. They get a 50-coin welcome on their first purchase too.
          </p>
        </div>
      </div>
    </main>
  );
}
