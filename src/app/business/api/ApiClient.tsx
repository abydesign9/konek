"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface ApiKey {
  id: string;
  label: string;
  key_prefix: string;
  mode: "sandbox" | "live";
  status: string;
  last_used_at: string | null;
  created_at: string;
}

interface ApiRequestLog {
  id: string;
  method: string;
  path: string;
  status_code: number;
  key_label: string;
  created_at: string;
}

export function ApiClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [role, setRole] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [requests, setRequests] = useState<ApiRequestLog[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me").then((r) => r.json()).then((d) => {
      setBusinessName(d.business?.legal_name);
      setRole(d.role);
    });
    fetch("/api/business/api-keys").then((r) => r.json()).then((d) => setKeys(d.keys ?? []));
    fetch("/api/business/api-keys/requests").then((r) => r.json()).then((d) => setRequests(d.requests ?? []));
  }
  useEffect(load, []);

  const canManage = role === "owner" || role === "admin";

  async function createKey() {
    if (!label.trim()) return setError("Give the key a label");
    setError(null);
    setBusy(true);
    const res = await fetch("/api/business/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, mode }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Could not create key");
      return;
    }
    setRevealedKey(d.key);
    setLabel("");
    setShowCreate(false);
    load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Anything using it will stop working immediately.")) return;
    await fetch(`/api/business/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-indigo">API</h1>
            <p className="mt-1 text-sm text-text-secondary">Programmatic access for developers, separate from your HR/ops users.</p>
          </div>
          {canManage && (
            <button onClick={() => { setShowCreate((s) => !s); setRevealedKey(null); }} className="shrink-0 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white">
              + New key
            </button>
          )}
        </div>

        {revealedKey && (
          <div className="konek-card-shadow mt-5 rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="text-sm font-bold text-indigo">Copy this key now — it won&apos;t be shown again</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-white px-3 py-2.5 text-xs">{revealedKey}</code>
            <button onClick={() => setRevealedKey(null)} className="mt-2 text-xs font-semibold text-indigo/60 hover:text-indigo">Done, I&apos;ve copied it</button>
          </div>
        )}

        {showCreate && (
          <div className="konek-card-shadow mt-5 rounded-2xl border border-border-soft bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Payroll integration" className="min-w-0 flex-1 rounded-xl border border-border-soft px-3 py-2.5 text-sm" />
              <select value={mode} onChange={(e) => setMode(e.target.value as "sandbox" | "live")} className="rounded-xl border border-border-soft px-3 py-2.5 text-sm">
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
              <button onClick={createKey} disabled={busy} className="rounded-xl bg-konek-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        <div className="konek-card-shadow mt-6 divide-y divide-border-soft rounded-2xl bg-white">
          {(keys ?? []).map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-indigo">{k.label}</p>
                <p className="text-xs text-text-secondary">
                  <code>{k.key_prefix}</code> · {k.mode} · {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
                </p>
              </div>
              {k.status === "active" ? (
                canManage && (
                  <button onClick={() => revoke(k.id)} className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                    Revoke
                  </button>
                )
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">revoked</span>
              )}
            </div>
          ))}
          {keys !== null && keys.length === 0 && (
            <p className="p-10 text-center text-sm text-text-secondary">No API keys yet.</p>
          )}
        </div>

        <div className="konek-card-shadow mt-6 rounded-2xl border border-border-soft bg-white p-5">
          <p className="mb-3 text-sm font-bold text-indigo">Trigger a distribution</p>
          <pre className="overflow-x-auto rounded-xl bg-indigo/[0.04] p-4 text-xs leading-relaxed text-indigo/80">
{`POST https://YOUR_DOMAIN/api/v1/business/distributions
Authorization: Bearer knk_live_...
Content-Type: application/json
Idempotency-Key: <a key you generate, unique per distribution>

{
  "purpose": "December data bonus",
  "items": [
    { "serviceType": "data", "network": "mtn", "phone": "08011112222", "amountMinor": 100000 }
  ]
}`}
          </pre>
          <p className="mt-3 text-xs text-text-secondary">
            Sandbox keys validate the request but never send anything or move money. Live keys process
            the distribution exactly like the Distributions page. Amounts are in kobo.
            <code className="rounded bg-indigo/[0.06] px-1 py-0.5">Idempotency-Key</code> is required on
            live requests — reuse the same key when retrying a timed-out call and it returns the original
            result instead of sending the distribution twice.
          </p>
        </div>

        <p className="mb-3 mt-8 text-sm font-bold text-indigo">Recent API activity</p>
        <div className="konek-card-shadow divide-y divide-border-soft rounded-2xl bg-white">
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-semibold text-indigo">{r.method} {r.path}</p>
                <p className="text-xs text-text-secondary">{r.key_label} · {new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.status_code < 300 ? "bg-konek-green/10 text-konek-green" : "bg-red-50 text-red-600"}`}>
                {r.status_code}
              </span>
            </div>
          ))}
          {requests !== null && requests.length === 0 && (
            <p className="p-10 text-center text-sm text-text-secondary">No API calls yet.</p>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
