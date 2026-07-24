"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge } from "@/components/adminUi";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  country_code: string;
  status: string;
  kyc_tier: number;
  kyc_status: string;
  ngn_minor: number;
  usd_minor: number;
  created_at: string;
}

const STATUS_TONE: Record<string, "green" | "gold" | "red" | "neutral"> = {
  active: "green",
  suspended: "gold",
  closed: "red",
};

export function CustomersConsole() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load(search = "") {
    fetch(`/api/admin/customers?q=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }
  useEffect(() => load(), []);

  async function setStatus(c: Customer, status: string, label: string) {
    if (!confirm(`${label} ${c.full_name ?? c.email ?? c.phone}?`)) return;
    setBusy(c.id);
    const res = await fetch(`/api/admin/customers/${c.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${label} done.` : d.error ?? "Failed");
    if (res.ok) load(q);
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone on Konek. Search, review balances and verification, and suspend, reactivate or close an account. Accounts are never hard deleted; a closed account keeps its financial history but loses access."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-konek-green">{msg}</p>}

      <Card
        title="Directory"
        action={
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              load(e.target.value);
            }}
            placeholder="Search name, email, phone…"
            className="w-56 rounded-lg border border-border-soft px-3 py-1.5 text-xs"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
              <tr>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3 text-right">NGN</th>
                <th className="py-2 pr-3 text-right">USD</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border-soft">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-indigo">{c.full_name ?? "Unnamed"}</p>
                    <p className="text-[11px] text-text-secondary">{c.email ?? c.phone}</p>
                  </td>
                  <td className="py-2 pr-3">{c.country_code}</td>
                  <td className="py-2 pr-3">
                    {c.kyc_tier} · {c.kyc_status}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">₦{(c.ngn_minor / 100).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">${(c.usd_minor / 100).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2 whitespace-nowrap">
                      {c.status === "active" ? (
                        <button onClick={() => setStatus(c, "suspended", "Suspend")} disabled={busy === c.id} className="text-xs font-semibold text-gold">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => setStatus(c, "active", "Reactivate")} disabled={busy === c.id} className="text-xs font-semibold text-konek-green">
                          Reactivate
                        </button>
                      )}
                      {c.status !== "closed" && (
                        <button onClick={() => setStatus(c, "closed", "Close account for")} disabled={busy === c.id} className="text-xs font-semibold text-red-600">
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-text-secondary">
                    No customers found.
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
