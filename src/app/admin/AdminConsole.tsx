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

interface Partner {
  id: string;
  partner_name: string;
  legal_name: string;
  revenue_share_pct: string;
  allowed_services: string[];
  status: string;
}

interface FraudItem {
  id: string;
  priority: string;
  status: string;
  flag: string;
  detail: { metric?: string; attemptedMinor?: number; maxMinor?: number };
  phone: string;
  assigned_admin_id: string | null;
}

interface ReconRun {
  vendor: string;
  period_start: string;
  ledger_total_minor: string;
  vendor_total_minor: string;
  drift_minor: string;
  status: string;
  run_at: string;
}

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  active: boolean;
}

interface SupportRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  phone: string;
  created_at: string;
}

const SUPPORT_STATUS_LABEL: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-gold/20 text-gold",
  low: "bg-indigo/10 text-indigo",
};

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
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerBiz, setNewPartnerBiz] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [fraudQueue, setFraudQueue] = useState<FraudItem[]>([]);
  const [reconRuns, setReconRuns] = useState<ReconRun[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [refunding, setRefunding] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportRow[]>([]);
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

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

  async function loadPartners() {
    const res = await fetch("/api/admin/partners");
    const data = await res.json();
    setPartners(data.partners ?? []);
  }

  async function loadFraudQueue() {
    const res = await fetch("/api/admin/fraud-queue");
    const data = await res.json();
    setFraudQueue(data.items ?? []);
  }

  async function loadReconRuns() {
    const res = await fetch("/api/admin/reconciliation-runs");
    const data = await res.json();
    setReconRuns(data.runs ?? []);
  }

  async function loadAdminUsers() {
    const res = await fetch("/api/admin/admin-users");
    const data = await res.json();
    setAdminUsers(data.admins ?? []);
  }

  async function loadSupportMessages() {
    const res = await fetch("/api/admin/support?status=open");
    const data = await res.json();
    setSupportMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadTxns("");
    loadVendors();
    loadAgents();
    loadBusinesses();
    loadPartners();
    loadFraudQueue();
    loadReconRuns();
    loadAdminUsers();
    loadSupportMessages();
  }, []);

  async function sendSupportReply(id: string, resolve: boolean) {
    if (!replyText.trim()) return;
    await fetch(`/api/admin/support/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText, resolve }),
    });
    setReplyText("");
    setOpenReplyId(null);
    loadSupportMessages();
  }

  async function assignToMe(id: string) {
    await fetch(`/api/admin/fraud-queue/${id}/assign`, { method: "POST" });
    loadFraudQueue();
  }

  async function resolveFraudItem(id: string, status: "resolved" | "escalated") {
    await fetch(`/api/admin/fraud-queue/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadFraudQueue();
  }

  async function inviteAdmin() {
    if (!newAdminEmail.trim()) return;
    await fetch("/api/admin/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newAdminEmail }),
    });
    setNewAdminEmail("");
    loadAdminUsers();
  }

  async function deactivateAdmin(id: string) {
    await fetch(`/api/admin/admin-users/${id}/deactivate`, { method: "POST" });
    loadAdminUsers();
  }

  async function createPartner() {
    if (!newPartnerBiz.trim() || !newPartnerName.trim()) return;
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessAccountId: newPartnerBiz, partnerName: newPartnerName }),
    });
    const data = await res.json();
    if (data.apiKey) setIssuedKey(data.apiKey);
    setNewPartnerBiz("");
    setNewPartnerName("");
    loadPartners();
  }

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
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Overview</h1>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Fraud queue</p>
        <div className="flex flex-col gap-2">
          {fraudQueue.map((item) => (
            <div key={item.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-indigo">{item.phone}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLOR[item.priority] ?? ""}`}>
                  {item.priority}
                </span>
              </div>
              <p className="text-xs text-indigo/60 mb-2">
                {item.flag} · {item.detail.metric} · attempted ₦{((item.detail.attemptedMinor ?? 0) / 100).toLocaleString()} vs
                cap ₦{((item.detail.maxMinor ?? 0) / 100).toLocaleString()} · {item.status}
              </p>
              {item.status === "open" && (
                <button onClick={() => assignToMe(item.id)} className="text-xs font-semibold text-indigo underline mr-3">
                  Assign to me
                </button>
              )}
              {item.status === "in_review" && (
                <>
                  <button
                    onClick={() => resolveFraudItem(item.id, "resolved")}
                    className="text-xs font-semibold text-konek-green underline mr-3"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => resolveFraudItem(item.id, "escalated")}
                    className="text-xs font-semibold text-red-600 underline"
                  >
                    Escalate
                  </button>
                </>
              )}
            </div>
          ))}
          {fraudQueue.length === 0 && <p className="text-sm text-indigo/50">Queue is clear.</p>}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Support (open)</p>
        <div className="flex flex-col gap-2">
          {supportMessages.map((m) => (
            <div key={m.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-indigo">{m.phone} · {m.subject}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-gold/20 text-gold">
                  {SUPPORT_STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
              <p className="text-xs text-indigo/60 mb-2 break-words">{m.body}</p>
              {openReplyId === m.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Reply to the customer…"
                    className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => sendSupportReply(m.id, false)} className="text-xs font-semibold text-indigo underline">
                      Reply
                    </button>
                    <button onClick={() => sendSupportReply(m.id, true)} className="text-xs font-semibold text-konek-green underline">
                      Reply &amp; resolve
                    </button>
                    <button onClick={() => { setOpenReplyId(null); setReplyText(""); }} className="text-xs text-indigo/50 underline">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenReplyId(m.id)} className="text-xs font-semibold text-indigo underline">
                  Reply
                </button>
              )}
            </div>
          ))}
          {supportMessages.length === 0 && <p className="text-sm text-indigo/50">No open support requests.</p>}
        </div>
      </section>

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

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">White-label partners</p>
        <div className="flex flex-col gap-2 mb-4">
          {partners.map((p) => (
            <div key={p.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <p className="text-sm font-medium text-indigo">{p.partner_name}</p>
              <p className="text-xs text-indigo/50">
                {p.legal_name} · {(Number(p.revenue_share_pct) * 100).toFixed(0)}% share · {p.allowed_services.join(", ")} · {p.status}
              </p>
            </div>
          ))}
          {partners.length === 0 && <p className="text-sm text-indigo/50">No partners yet.</p>}
        </div>
        <div className="rounded-xl border border-indigo/10 bg-white p-4">
          <p className="text-xs text-indigo/60 mb-2">Issue a new partner API key (verified business account ID)</p>
          <div className="flex gap-2 mb-2">
            <input
              value={newPartnerBiz}
              onChange={(e) => setNewPartnerBiz(e.target.value)}
              placeholder="business_account id"
              className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-xs"
            />
            <input
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
              placeholder="partner name"
              className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-xs"
            />
            <button
              onClick={createPartner}
              className="rounded-lg bg-indigo text-white text-xs font-semibold px-3 py-2 whitespace-nowrap"
            >
              Issue key
            </button>
          </div>
          {issuedKey && (
            <p className="text-xs font-mono text-konek-green break-all">
              {issuedKey} — copy now, shown once
            </p>
          )}
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

      <section className="mt-8 mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Reconciliation history</p>
        <div className="flex flex-col gap-2">
          {reconRuns.map((r, i) => (
            <div key={i} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo">{r.vendor}</span>
                <span className={`text-xs font-semibold ${Number(r.drift_minor) === 0 ? "text-konek-green" : "text-red-600"}`}>
                  {Number(r.drift_minor) === 0 ? "zero drift" : `drift ${r.drift_minor}`}
                </span>
              </div>
              <p className="text-xs text-indigo/50">
                {r.period_start} · ledger {r.ledger_total_minor} vs cache {r.vendor_total_minor}
              </p>
            </div>
          ))}
          {reconRuns.length === 0 && <p className="text-sm text-indigo/50">No reconciliation runs yet — run `npm run reconcile`.</p>}
        </div>
      </section>

      <section className="mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Admin users</p>
        <div className="flex flex-col gap-2 mb-4">
          {adminUsers.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm text-indigo">{a.email}</p>
                <p className="text-xs text-indigo/50">{a.role} · {a.active ? "active" : "deactivated"}</p>
              </div>
              {a.active && (
                <button onClick={() => deactivateAdmin(a.id)} className="text-xs font-semibold text-red-600 underline">
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="new-admin@konek.app"
            className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
          />
          <button onClick={inviteAdmin} className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2">
            Invite
          </button>
        </div>
      </section>
    </>
  );
}
