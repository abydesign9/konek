"use client";

import { useEffect, useState } from "react";

interface TopReferrer {
  phone: string;
  referral_code: string;
  total_referred: string;
  qualified: string;
}

interface RecentReferral {
  referral_code: string;
  referrer_phone: string;
  referred_phone: string;
  status: string;
  created_at: string;
}

interface ReferralsData {
  totalReferred: number;
  qualified: number;
  pending: number;
  coinsPaidOut: number;
  topReferrers: TopReferrer[];
  recent: RecentReferral[];
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-indigo/10 text-indigo",
  qualified: "bg-konek-green/15 text-konek-green",
  paid: "bg-gold/15 text-gold",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-indigo/10 bg-white p-4">
      <p className="text-xs text-indigo/50 mb-1">{label}</p>
      <p className="font-heading text-2xl font-bold text-indigo">{value}</p>
      {sub && <p className="text-xs text-indigo/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ReferralsConsole() {
  const [data, setData] = useState<ReferralsData | null>(null);

  useEffect(() => {
    fetch("/api/admin/referrals")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-sm text-indigo/50">Loading…</p>;

  return (
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Referrals</h1>
      <p className="text-sm text-indigo/60 mb-6">Who&rsquo;s bringing people onto Konek, and what it&rsquo;s costing.</p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard label="Total referred" value={data.totalReferred} />
        <StatCard label="Signed up & qualified" value={data.qualified} sub={`${data.pending} pending`} />
        <StatCard label="Coins paid out" value={data.coinsPaidOut.toLocaleString()} sub="both sides combined" />
        <StatCard
          label="Conversion rate"
          value={data.totalReferred > 0 ? `${Math.round((data.qualified / data.totalReferred) * 100)}%` : "—"}
        />
      </div>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Top referrers</p>
        <div className="flex flex-col gap-2">
          {data.topReferrers.map((r) => (
            <div
              key={r.referral_code}
              className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-indigo">{r.phone}</p>
                <p className="text-xs text-indigo/50 font-mono">{r.referral_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-indigo">{r.total_referred} referred</p>
                <p className="text-xs text-konek-green">{r.qualified} qualified</p>
              </div>
            </div>
          ))}
          {data.topReferrers.length === 0 && <p className="text-sm text-indigo/50">No referrals yet.</p>}
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-indigo mb-3">Recent referrals</p>
        <div className="flex flex-col gap-2">
          {data.recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-indigo truncate">
                  {r.referrer_phone} → {r.referred_phone}
                </p>
                <p className="text-xs text-indigo/50">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${STATUS_CLASS[r.status] ?? ""}`}>
                {r.status}
              </span>
            </div>
          ))}
          {data.recent.length === 0 && <p className="text-sm text-indigo/50">No referrals yet.</p>}
        </div>
      </section>
    </>
  );
}
