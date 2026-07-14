"use client";

import { useEffect, useState } from "react";

interface Txn {
  id: string;
  type: string;
  status: string;
  currency: string;
  amount_minor: string;
  vendor: string | null;
  vendor_ref: string | null;
  failure_reason: string | null;
  recipient: { phone?: string; network?: string };
  created_at: string;
  phone: string;
}

interface Vendor {
  id: string;
  kind: string;
  priority: number;
  healthy: boolean;
  last_health_check: string | null;
}

interface Agent {
  id: string;
  tier: string;
  commission_rate: string;
  status: string;
  phone: string;
  unpaid_minor: string;
}

interface Business {
  id: string;
  legal_name: string;
  business_type: string;
  kyb_status: string;
  phone: string;
}

const STATUS_COLOR: Record<string, string> = {
  delivered: "text-konek-green",
  failed: "text-red-600",
  refunded: "text-gold",
  pending_vendor: "text-indigo/60",
  initiated: "text-indigo/60",
};

export function AdminConsole() {
  const [query, setQuery] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTxns(q: string) {
    const res = await fetch(`/api/admin/transactions?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTxns(data.transactions ?? []);
  }

  async function loadVendors() {
    const res = await fetch("/api/admin/vendors");
    const data = await res.json();
    setVendors(data.vendors ?? []);
  }

  async function loadAgents() {
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
  }

  async function loadBusinesses() {
    const res = await fetch("/api/admin/business");
    const data = await res.json();
    setBusinesses(data.businesses ?? []);
  }

  useEffect(() => {
    loadTxns("");
    loadVendors();
    loadAgents();
    loadBusinesses();
  }, []);

  async function approveAgent(id: string) {
    await fetch(`/api/admin/agents/${id}/approve`, { method: "POST" });
    loadAgents();
  }

  async function payCommissions(id: string) {
    const res = await fetch(`/api/admin/agents/${id}/pay-commissions`, { method: "POST" });
    const data = await res.json();
    setMessage(data.journalId ? `Paid — journal ${data.journalId}` : "Nothing owed");
    loadAgents();
  }

  async function approveBusiness(id: string) {
    await fetch(`/api/admin/business/${id}/approve`, { method: "POST" });
    loadBusinesses();
  }

  async function refund(txnId: string) {
    setRefunding(txnId);
    setMessage(null);
    const res = await fetch(`/api/admin/refund/${txnId}`, { method: "POST" });
    setRefunding(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Refund failed: ${data.error}`);
      return;
    }
    setMessage(`Refunded — reversal journal ${data.journalId}`);
    loadTxns(query);
  }

  async function toggleVendorHealth(id: string, healthy: boolean) {
    await fetch(`/api/admin/vendors/${id}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthy }),
    });
    loadVendors();
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Admin console</h1>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Vendor health</p>
        <div className="flex flex-col gap-2">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-indigo">
                  {v.id} <span className="text-indigo/40">· priority {v.priority}</span>
                </p>
                <p className="text-xs text-indigo/50">{v.kind}</p>
              </div>
              <button
                onClick={() => toggleVendorHealth(v.id, !v.healthy)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  v.healthy ? "bg-konek-green/15 text-konek-green" : "bg-red-100 text-red-600"
                }`}
              >
                {v.healthy ? "Healthy" : "Unhealthy"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Agents</p>
        <div className="flex flex-col gap-2">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-indigo">
                  {a.phone} <span className="text-indigo/40">· {a.tier}</span>
                </p>
                <p className="text-xs text-indigo/50">
                  {a.status} · unpaid ₦{(Number(a.unpaid_minor) / 100).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {a.status === "pending" && (
                  <button
                    onClick={() => approveAgent(a.id)}
                    className="rounded-full bg-konek-green/15 text-konek-green text-xs font-semibold px-3 py-1.5"
                  >
                    Approve
                  </button>
                )}
                {a.status === "active" && Number(a.unpaid_minor) > 0 && (
                  <button
                    onClick={() => payCommissions(a.id)}
                    className="rounded-full bg-indigo/10 text-indigo text-xs font-semibold px-3 py-1.5"
                  >
                    Pay commissions
                  </button>
                )}
              </div>
            </div>
          ))}
          {agents.length === 0 && <p className="text-sm text-indigo/50">No agent applications.</p>}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Business accounts (KYB)</p>
        <div className="flex flex-col gap-2">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-indigo">{b.legal_name}</p>
                <p className="text-xs text-indigo/50">
                  {b.phone} · {b.business_type} · {b.kyb_status}
                </p>
              </div>
              {b.kyb_status === "pending" && (
                <button
                  onClick={() => approveBusiness(b.id)}
                  className="rounded-full bg-konek-green/15 text-konek-green text-xs font-semibold px-3 py-1.5"
                >
                  Approve KYB
                </button>
              )}
            </div>
          ))}
          {businesses.length === 0 && <p className="text-sm text-indigo/50">No business applications.</p>}
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-indigo mb-3">Transactions</p>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            loadTxns(e.target.value);
          }}
          placeholder="Search phone, txn id, vendor ref…"
          className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-konek-green"
        />

        {message && <p className="text-sm text-konek-green font-medium mb-4">{message}</p>}

        <div className="flex flex-col gap-2">
          {txns.map((t) => (
            <div key={t.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-indigo capitalize">{t.type.replace("_", " ")}</span>
                <span className={`text-xs font-semibold ${STATUS_COLOR[t.status] ?? "text-indigo"}`}>
                  {t.status}
                </span>
              </div>
              <p className="text-xs text-indigo/60 mb-1">
                {t.phone} · ₦{(Number(t.amount_minor) / 100).toLocaleString()} · {t.vendor ?? "—"}
              </p>
              <p className="text-[10px] text-indigo/40 font-mono mb-2">{t.id}</p>
              {t.status === "delivered" && (
                <button
                  onClick={() => refund(t.id)}
                  disabled={refunding === t.id}
                  className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
                >
                  {refunding === t.id ? "Refunding…" : "Refund"}
                </button>
              )}
            </div>
          ))}
          {txns.length === 0 && <p className="text-sm text-indigo/50">No transactions found.</p>}
        </div>
      </section>
    </main>
  );
}
