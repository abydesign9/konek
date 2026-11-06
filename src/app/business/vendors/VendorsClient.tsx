"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";
import { BANKS } from "@/lib/payout/banks";

interface Vendor {
  id: string;
  name: string;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
}

interface Transfer {
  id: string;
  amount_minor: string;
  currency: string;
  status: string;
  vendor_name: string;
  bank_name: string;
  account_number_last4: string;
  created_at: string;
}

function naira(minor: number | string) {
  return `₦${(Number(minor) / 100).toLocaleString()}`;
}

const STATUS_TONE: Record<string, string> = {
  delivered: "bg-raviion-green/10 text-raviion-green",
  pending_vendor: "bg-gold/15 text-gold",
  initiated: "bg-gold/15 text-gold",
  failed: "bg-red-50 text-red-600",
};

export function VendorsClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [name, setName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [showSend, setShowSend] = useState<string | null>(null); // vendorId
  const [amount, setAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me").then((r) => r.json()).then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/vendors").then((r) => r.json()).then((d) => setVendors(d.vendors ?? []));
    fetch("/api/business/vendors/transfers").then((r) => r.json()).then((d) => setTransfers(d.transfers ?? []));
  }
  useEffect(load, []);

  async function addVendor() {
    if (!name.trim()) return setAddError("Vendor name is required");
    if (!bankCode) return setAddError("Choose a bank");
    if (!/^\d{10}$/.test(accountNumber)) return setAddError("Enter a valid 10-digit account number");
    setAddError(null);
    setAddBusy(true);
    const res = await fetch("/api/business/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bankCode, accountNumber }),
    });
    const d = await res.json().catch(() => ({}));
    setAddBusy(false);
    if (!res.ok) {
      setAddError(d.error ?? "Could not add vendor");
      return;
    }
    setName("");
    setBankCode("");
    setAccountNumber("");
    setShowAddVendor(false);
    load();
  }

  async function sendTransfer(vendorId: string) {
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isInteger(minor) || minor <= 0) return setSendError("Enter a valid amount");
    setSendError(null);
    setSendBusy(true);
    const res = await fetch("/api/business/vendors/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, amountMinor: minor, idempotencyKey: crypto.randomUUID() }),
    });
    const d = await res.json().catch(() => ({}));
    setSendBusy(false);
    if (!res.ok) {
      setSendError(d.error ?? "Transfer failed");
      return;
    }
    setSendMsg(d.status === "delivered" ? `Sent ${naira(minor)}.` : `Transfer ${d.status}.`);
    setAmount("");
    setShowSend(null);
    load();
  }

  return (
    <BusinessShell businessName={businessName}>
      <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">Vendors</h1>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Save vendor bank details and pay them straight from the business wallet.</p>
        <button
          onClick={() => setShowAddVendor((s) => !s)}
          className="shrink-0 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Add vendor
        </button>
      </div>

      {showAddVendor && (
        <div className="raviion-card-shadow mb-5 rounded-2xl border border-border-soft bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" className="rounded-xl border border-border-soft px-3 py-2.5 text-sm" />
            <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="rounded-xl border border-border-soft px-3 py-2.5 text-sm">
              <option value="">Choose bank…</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Account number"
              inputMode="numeric"
              className="rounded-xl border border-border-soft px-3 py-2.5 text-sm"
            />
          </div>
          <button onClick={addVendor} disabled={addBusy} className="mt-3 rounded-xl bg-raviion-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {addBusy ? "Verifying…" : "Save vendor"}
          </button>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </div>
      )}

      {sendMsg && <p className="mb-4 rounded-xl bg-raviion-green/10 px-4 py-2.5 text-sm font-semibold text-raviion-green">{sendMsg}</p>}

      <div className="raviion-card-shadow mb-8 divide-y divide-border-soft rounded-2xl bg-white">
        {(vendors ?? []).map((v) => (
          <div key={v.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo">{v.name}</p>
                <p className="text-xs text-text-secondary">{v.account_name} · {v.bank_name} ••••{v.account_number_last4}</p>
              </div>
              <button
                onClick={() => { setShowSend(showSend === v.id ? null : v.id); setSendError(null); }}
                className="shrink-0 rounded-lg bg-indigo/5 px-3 py-1.5 text-xs font-semibold text-indigo"
              >
                Pay
              </button>
            </div>
            {showSend === v.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={amount}
                  inputMode="decimal"
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="Amount (₦)"
                  className="min-w-0 flex-1 rounded-xl border border-border-soft px-3 py-2 text-sm"
                />
                <button onClick={() => sendTransfer(v.id)} disabled={sendBusy} className="rounded-xl bg-raviion-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {sendBusy ? "Sending…" : "Send"}
                </button>
              </div>
            )}
            {showSend === v.id && sendError && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
          </div>
        ))}
        {vendors !== null && vendors.length === 0 && (
          <p className="p-8 text-center text-sm text-text-secondary">No vendors saved yet.</p>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold text-indigo">Transfer history</p>
      <div className="raviion-card-shadow divide-y divide-border-soft rounded-2xl bg-white">
        {(transfers ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-indigo">{t.vendor_name}</p>
              <p className="text-xs text-text-secondary">{t.bank_name} ••••{t.account_number_last4} · {new Date(t.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-indigo">{naira(t.amount_minor)}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[t.status] ?? ""}`}>{t.status}</span>
            </div>
          </div>
        ))}
        {transfers !== null && transfers.length === 0 && (
          <p className="p-8 text-center text-sm text-text-secondary">No transfers yet.</p>
        )}
      </div>
    </BusinessShell>
  );
}
