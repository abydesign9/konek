"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentData {
  id: string;
  tier: string;
  commissionRate: number;
  status: string;
  unpaidMinor: number;
  paidMinor: number;
  floatBalanceMinor: number;
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

  if (agent === undefined) return <main className="min-h-screen bg-background px-6 py-8" />;

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Agent program</h1>

      {!agent && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5">
          <p className="text-sm text-indigo/70 mb-4">
            Sell airtime and data to your community and earn a commission on every sale you make
            through your own wallet.
          </p>
          <button
            onClick={apply}
            disabled={applying}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply to become an agent"}
          </button>
        </div>
      )}

      {agent && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-indigo px-5 py-4 text-white">
            <p className="text-xs text-white/60 mb-1">Status</p>
            <p className="font-heading text-lg font-bold capitalize">
              {agent.status} · {agent.tier} tier
            </p>
            {agent.status === "pending" && (
              <p className="text-xs text-white/70 mt-2">Waiting on admin approval.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-indigo/10 bg-white p-4">
              <p className="text-xs text-indigo/60 mb-1">Commission rate</p>
              <p className="font-heading text-lg font-bold text-indigo">
                {(agent.commissionRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-indigo/10 bg-white p-4">
              <p className="text-xs text-indigo/60 mb-1">Float balance</p>
              <p className="font-heading text-lg font-bold text-indigo">
                ₦{(agent.floatBalanceMinor / 100).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo/10 bg-white p-4">
              <p className="text-xs text-indigo/60 mb-1">Unpaid commission</p>
              <p className="font-heading text-lg font-bold text-gold">
                ₦{(agent.unpaidMinor / 100).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo/10 bg-white p-4">
              <p className="text-xs text-indigo/60 mb-1">Paid to date</p>
              <p className="font-heading text-lg font-bold text-konek-green">
                ₦{(agent.paidMinor / 100).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <Link href="/home" className="text-sm text-indigo/60 underline mt-8 inline-block">
        Back to home
      </Link>
    </main>
  );
}
