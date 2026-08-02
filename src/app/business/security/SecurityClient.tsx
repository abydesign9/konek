"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";

interface AuditEntry {
  id: string;
  actor: string;
  actor_name: string | null;
  action: string;
  entity: string | null;
  created_at: string;
}

function actionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function SecurityClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/business/me").then((r) => r.json()).then((d) => setBusinessName(d.business?.legal_name));
    fetch("/api/business/audit-log").then((r) => r.json()).then((d) => setEntries(d.entries ?? []));
  }, []);

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-indigo">Security</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A record of every change made on this business account — who did what, and when.
        </p>

        <div className="konek-card-shadow mt-5 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3.5 text-sm text-indigo">
          Single sign-on (SSO) is coming soon — it needs an identity provider (Google Workspace, Microsoft
          Entra, Okta) to be chosen first.
        </div>

        <p className="mb-3 mt-6 text-sm font-bold text-indigo">Activity log</p>
        <div className="konek-card-shadow divide-y divide-border-soft rounded-2xl bg-white">
          {(entries ?? []).map((e) => (
            <div key={e.id} className="p-4">
              <p className="text-sm font-semibold text-indigo">{actionLabel(e.action)}</p>
              <p className="text-xs text-text-secondary">
                {e.actor_name ?? (e.actor === "system" ? "System" : "Team member")} · {new Date(e.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {entries !== null && entries.length === 0 && (
            <p className="p-10 text-center text-sm text-text-secondary">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
