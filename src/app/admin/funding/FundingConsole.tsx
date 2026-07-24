"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge } from "@/components/adminUi";

interface Funding {
  id: string;
  status: string;
  currency: string;
  amount_minor: number;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string;
}

export function FundingConsole() {
  const [rows, setRows] = useState<Funding[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/funding")
      .then((r) => r.json())
      .then((d) => setRows(d.funding ?? []));
  }
  useEffect(load, []);

  async function verify(id: string) {
    setBusy(id);
    setMsg(null);
    const res = await fetch(`/api/admin/funding/${id}/verify`, { method: "POST" });
    setBusy(null);
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? d.message ?? "Checked." : d.error ?? "Failed");
    if (res.ok) load();
  }

  return (
    <>
      <PageHeader
        title="Funding reconciliation"
        description="Wallet top-ups that never completed. When a customer says they were charged but the balance did not move (a gateway timeout), verify the payment here. We re-check the reference with Paystack and credit the wallet only if the payment truly succeeded, exactly once."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-konek-green">{msg}</p>}

      <Card title="Open and failed top-ups (last 30 days)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
              <tr>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-3">When</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-soft">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-indigo">{r.full_name ?? "Unnamed"}</p>
                    <p className="text-[11px] text-text-secondary">{r.email ?? r.phone}</p>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.currency === "USD" ? "$" : "₦"}
                    {(r.amount_minor / 100).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.status === "failed" ? "red" : "gold"}>{r.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-text-secondary">{r.id.slice(0, 8)}…</td>
                  <td className="py-2 pr-3 text-xs text-text-secondary">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2">
                    <button
                      onClick={() => verify(r.id)}
                      disabled={busy === r.id}
                      className="rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy === r.id ? "Checking…" : "Verify & credit"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-text-secondary">
                    Nothing pending. Every recent top-up has settled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
