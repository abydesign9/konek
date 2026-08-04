"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Grid, PageHeader, StatCard, Table, Td, Th } from "@/components/adminUi";

interface TopReferrer {
  phone: string;
  referral_code: string;
  total_referred: string;
  qualified: string;
}

interface RecentReferral {
  id: string;
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

const STATUS_TONE: Record<string, "indigo" | "green" | "gold" | "red"> = {
  pending: "indigo",
  qualified: "green",
  paid: "gold",
  rejected: "red",
};

export function ReferralsConsole() {
  const [data, setData] = useState<ReferralsData | null>(null);

  function load() {
    fetch("/api/admin/referrals")
      .then((res) => res.json())
      .then(setData);
  }
  useEffect(load, []);

  async function reject(id: string) {
    if (!confirm("Reject this referral so it never pays out?")) return;
    await fetch(`/api/admin/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    load();
  }

  return (
    <>
      <PageHeader title="Referrals" description="Who's bringing people onto Konek, and what it's costing." />

      {!data ? (
        <EmptyState message="Loading…" />
      ) : (
        <Grid>
          <div className="col-span-1 lg:col-span-3">
            <StatCard label="Total referred" value={data.totalReferred} />
          </div>
          <div className="col-span-1 lg:col-span-3">
            <StatCard label="Signed up & qualified" value={data.qualified} sub={`${data.pending} pending`} tone="green" />
          </div>
          <div className="col-span-1 lg:col-span-3">
            <StatCard label="Coins paid out" value={data.coinsPaidOut.toLocaleString()} sub="both sides combined" tone="gold" />
          </div>
          <div className="col-span-1 lg:col-span-3">
            <StatCard
              label="Conversion rate"
              value={data.totalReferred > 0 ? `${Math.round((data.qualified / data.totalReferred) * 100)}%` : "—"}
            />
          </div>

          <div className="col-span-1 lg:col-span-5">
            <Card title="Top referrers">
              {data.topReferrers.length === 0 ? (
                <EmptyState message="No referrals yet." />
              ) : (
                <div className="flex flex-col gap-2">
                  {data.topReferrers.map((r) => (
                    <div key={r.referral_code} className="flex items-center justify-between rounded-xl border border-border-soft px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-indigo">{r.phone}</p>
                        <p className="font-mono text-xs text-text-secondary">{r.referral_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-indigo">{r.total_referred} referred</p>
                        <p className="text-xs text-konek-green">{r.qualified} qualified</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-1 lg:col-span-7">
            <Card title="Recent referrals">
              {data.recent.length === 0 ? (
                <EmptyState message="No referrals yet." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Referrer</Th>
                      <Th>Referred</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                      <Th>{""}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id}>
                        <Td>{r.referrer_phone}</Td>
                        <Td>{r.referred_phone}</Td>
                        <Td>
                          <Badge tone={STATUS_TONE[r.status] ?? "indigo"}>{r.status}</Badge>
                        </Td>
                        <Td className="text-text-secondary">{new Date(r.created_at).toLocaleDateString()}</Td>
                        <Td>
                          {r.status !== "paid" && r.status !== "rejected" && (
                            <button
                              onClick={() => reject(r.id)}
                              className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"
                            >
                              Reject
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        </Grid>
      )}
    </>
  );
}
