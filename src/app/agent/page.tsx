"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { txnTypeLabel } from "@/lib/format";

interface RecentCommission {
  amountMinor: number;
  currency: string;
  paid: boolean;
  createdAt: string;
  txnType: string | null;
  txnAmountMinor: number | null;
}

interface AgentData {
  id: string;
  tier: string;
  commissionRate: number;
  status: string;
  since: string;
  unpaidMinor: number;
  paidMinor: number;
  lifetimeSales: number;
  floatBalanceMinor: number;
  month: {
    sales: number;
    earnedMinor: number;
    volumeMinor: number;
    rank: number | null;
    totalAgents: number;
  };
  recent: RecentCommission[];
}

const RESPONSIBILITIES = [
  { t: "Sell Konek services", d: "Airtime, data, bills and eSIMs to your campus or community — every delivered sale earns your commission rate." },
  { t: "Keep your float funded", d: "Sales are paid from your wallet float. Top it up so you never miss a sale." },
  { t: "Bring people onto Konek", d: "Help customers sign up and verify — referred users count toward your performance." },
  { t: "Stay in good standing", d: "Fraud-free sales only. Suspended agents forfeit unpaid commissions." },
];

function naira(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function AgentPage() {
  const [agent, setAgent] = useState<AgentData | null | undefined>(undefined);
  const [applying, setApplying] = useState(false);

  function load() {
    fetch("/api/agents/me")
      .then((res) => res.json())
      .then((data) => setAgent(data.agent));
  }

  useEffect(load, []);

  async function apply() {
    setApplying(true);
    await fetch("/api/agents/apply", { method: "POST" });
    setApplying(false);
    load();
  }

  if (agent === undefined) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Agent dashboard" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        {!agent && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-5">
            <h2 className="font-heading text-lg font-bold text-indigo mb-2">Become a Konek agent</h2>
            <p className="text-sm text-indigo/70 mb-4">
              Sell airtime, data, bills and eSIMs to your campus or community and earn a commission on
              every sale you make through your own wallet.
            </p>
            <div className="mb-5 flex flex-col gap-3">
              {RESPONSIBILITIES.map((r) => (
                <div key={r.t} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-konek-green" />
                  <div>
                    <p className="text-sm font-semibold text-indigo">{r.t}</p>
                    <p className="text-xs text-indigo/55">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={apply}
              disabled={applying}
              className="w-full rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
            >
              {applying ? "Applying…" : "Apply to become an agent"}
            </button>
            <p className="mt-3 text-center text-xs text-indigo/50">
              Applications are reviewed by the Konek team before you can start selling.
            </p>
          </div>
        )}

        {agent && agent.status === "pending" && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
            <h2 className="font-heading font-bold text-indigo mb-1">Application under review 🟡</h2>
            <p className="text-sm text-indigo/70">
              The Konek team is reviewing your agent application. You&apos;ll be able to start selling
              and earning commission as soon as you&apos;re approved.
            </p>
          </div>
        )}

        {agent && agent.status === "suspended" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-heading font-bold text-red-700 mb-1">Account suspended</h2>
            <p className="text-sm text-red-600/80">
              Your agent account is suspended. Contact support to resolve this.
            </p>
          </div>
        )}

        {agent && agent.status === "active" && (
          <div className="flex flex-col gap-4">
            {/* Status header */}
            <div className="rounded-3xl bg-indigo px-5 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60 mb-1">Konek agent · <span className="capitalize">{agent.tier}</span> tier</p>
                  <p className="font-heading text-2xl font-bold">{naira(agent.unpaidMinor)}</p>
                  <p className="text-xs text-white/70">unpaid commission — paid out by Konek</p>
                </div>
                <span className="rounded-full bg-konek-green/25 px-3 py-1.5 text-xs font-semibold text-konek-green">
                  {(agent.commissionRate * 100).toFixed(1)}% rate
                </span>
              </div>
            </div>

            {/* This month */}
            <div className="rounded-2xl border border-indigo/10 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo">This month</p>
                {agent.month.rank && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                    #{agent.month.rank} of {agent.month.totalAgents} agents
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-heading text-lg font-bold text-indigo">{agent.month.sales}</p>
                  <p className="text-xs text-indigo/55">sales</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-bold text-indigo">{naira(agent.month.volumeMinor)}</p>
                  <p className="text-xs text-indigo/55">volume</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-bold text-konek-green">{naira(agent.month.earnedMinor)}</p>
                  <p className="text-xs text-indigo/55">earned</p>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-indigo/10 bg-white p-4">
                <p className="text-xs text-indigo/60 mb-1">Float balance</p>
                <p className="font-heading text-lg font-bold text-indigo">{naira(agent.floatBalanceMinor)}</p>
              </div>
              <div className="rounded-2xl border border-indigo/10 bg-white p-4">
                <p className="text-xs text-indigo/60 mb-1">Paid to date</p>
                <p className="font-heading text-lg font-bold text-konek-green">{naira(agent.paidMinor)}</p>
              </div>
            </div>

            {/* Recent earnings */}
            <div className="rounded-2xl border border-indigo/10 bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-indigo">Recent earnings</p>
              {agent.recent.length === 0 ? (
                <p className="text-sm text-indigo/50">
                  No sales yet — buy airtime, data or bills from your wallet and your commission shows
                  up here.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {agent.recent.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-indigo/5 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-indigo">
                          {r.txnType ? txnTypeLabel(r.txnType) : "Sale"}
                          {r.txnAmountMinor ? ` · ${naira(r.txnAmountMinor)}` : ""}
                        </p>
                        <p className="text-xs text-indigo/50">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-konek-green">+{naira(r.amountMinor)}</p>
                        <p className="text-[11px] text-indigo/50">{r.paid ? "paid" : "pending payout"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Responsibilities */}
            <div className="rounded-2xl border border-indigo/10 bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-indigo">Your responsibilities</p>
              <div className="flex flex-col gap-3">
                {RESPONSIBILITIES.map((r) => (
                  <div key={r.t} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-konek-green" />
                    <div>
                      <p className="text-sm font-semibold text-indigo">{r.t}</p>
                      <p className="text-xs text-indigo/55">{r.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
