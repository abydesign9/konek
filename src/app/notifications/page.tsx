"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Notification {
  id: string;
  channel: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface Preferences {
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  price_alerts: boolean;
}

const TOGGLES: { key: keyof Preferences; label: string }[] = [
  { key: "push_enabled", label: "Push notifications" },
  { key: "sms_enabled", label: "SMS" },
  { key: "email_enabled", label: "Email" },
  { key: "whatsapp_enabled", label: "WhatsApp" },
  { key: "price_alerts", label: "Price drop alerts" },
];

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setLoading(false);
      });
    fetch("/api/notifications/preferences")
      .then((res) => res.json())
      .then(setPrefs);
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function toggle(key: keyof Preferences) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Notifications"
        backHref="/home"
        right={
          <button onClick={() => setShowSettings((s) => !s)} className="text-sm font-semibold text-konek-green">
            {showSettings ? "Done" : "Settings"}
          </button>
        }
      />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      {showSettings && prefs && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
          <p className="text-sm font-semibold text-indigo mb-3">Channels</p>
          <div className="flex flex-col gap-3">
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-indigo">{t.label}</span>
                <button
                  type="button"
                  onClick={() => toggle(t.key)}
                  aria-pressed={prefs[t.key]}
                  className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${
                    prefs[t.key] ? "bg-konek-green" : "bg-indigo/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      prefs[t.key] ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-indigo/60">Recent</p>
        <Link href="/support" className="text-sm font-semibold text-konek-green hover:underline">
          Contact support
        </Link>
      </div>

      {loading && <p className="text-sm text-indigo/50">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-indigo/50">No notifications yet.</p>}

      <div className="flex flex-col gap-2 mb-8">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read_at && markRead(n.id)}
            className={`text-left rounded-xl border px-4 py-3 ${
              n.read_at ? "border-indigo/10 bg-white" : "border-konek-green/30 bg-konek-green/5"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-indigo">{n.title}</span>
              {!n.read_at && <span className="w-2 h-2 rounded-full bg-konek-green" />}
            </div>
            <p className="text-xs text-indigo/60">{n.body}</p>
          </button>
        ))}
      </div>
      </div>
    </main>
  );
}
