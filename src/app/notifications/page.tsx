"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  channel: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setLoading(false);
      });
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-6">Notifications</h1>

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

      <Link href="/home" className="text-sm text-indigo/60 underline">
        Back to home
      </Link>
    </main>
  );
}
