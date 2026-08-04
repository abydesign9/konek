"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface SessionRow {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
}

// Coarse device label from the user-agent string — good enough to tell
// "my phone" from "a browser I don't recognize" without a full UA-parser
// dependency for something this simple.
function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android device";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown device";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionsClient() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  function load() {
    fetch("/api/settings/sessions")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions ?? []);
        setCurrentId(d.currentSessionId ?? null);
      });
  }
  useEffect(load, []);

  async function revoke(id: string) {
    setRevoking(id);
    await fetch(`/api/settings/sessions/${id}`, { method: "DELETE" });
    setRevoking(null);
    load();
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Device and session management" backHref="/settings" />

      <div className="mx-auto flex max-w-lg flex-col gap-2.5 px-5 py-6">
        {sessions === null && <p className="text-sm text-indigo/50">Loading…</p>}
        {sessions?.map((s) => {
          const isCurrent = s.id === currentId;
          return (
            <div key={s.id} className="konek-card-shadow flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo">
                  {deviceLabel(s.user_agent)}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-konek-green/15 px-2 py-0.5 text-[11px] font-semibold text-konek-green">
                      This device
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-indigo/55">
                  {s.ip ? `${s.ip} · ` : ""}Last active {timeAgo(s.last_seen_at)}
                </p>
              </div>
              {!isCurrent && (
                <button
                  onClick={() => revoke(s.id)}
                  disabled={revoking === s.id}
                  className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  {revoking === s.id ? "…" : "Sign out"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
