"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Notification {
  id: string;
  channel: string;
  kind: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

// kind -> presentation. Anything unknown falls back to the bell.
const KIND_META: Record<string, { icon: string; label: string }> = {
  txn_receipt: { icon: "💰", label: "Transactions" },
  price_alert: { icon: "📈", label: "Alerts" },
  streak_reminder: { icon: "🔥", label: "Rewards" },
  support: { icon: "💬", label: "Support" },
};

const FILTERS = ["All", "Transactions", "Rewards", "Support"] as const;
type Filter = (typeof FILTERS)[number];

function dayGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => setItems([]));
  }
  useEffect(load, []);

  async function markRead(n: Notification) {
    if (n.read_at) return;
    // Optimistic — flip locally, then persist.
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    const unread = (items ?? []).filter((n) => !n.read_at);
    setItems((prev) => prev?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) ?? null);
    await Promise.all(
      unread.map((n) =>
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        }).catch(() => {})
      )
    );
  }

  const unreadCount = (items ?? []).filter((n) => !n.read_at).length;

  const grouped = useMemo(() => {
    const visible = (items ?? []).filter((n) => {
      if (filter === "All") return true;
      return (KIND_META[n.kind]?.label ?? "Other") === filter;
    });
    const groups: { day: string; items: Notification[] }[] = [];
    for (const n of visible) {
      const day = dayGroup(n.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(n);
      else groups.push({ day, items: [n] });
    }
    return groups;
  }, [items, filter]);

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader
        title="Notifications"
        backHref="/home"
        right={
          unreadCount > 0 ? (
            <button onClick={markAllRead} className="text-xs font-semibold text-konek-green">
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="konek-scrollbar-none mb-5 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                filter === f ? "bg-indigo text-white" : "border border-indigo/15 bg-white text-indigo"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {items === null && (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-indigo/5" />
            ))}
          </div>
        )}

        {items !== null && grouped.length === 0 && (
          <div className="rounded-3xl border border-indigo/10 bg-white p-8 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <p className="font-semibold text-indigo">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-indigo/55">
              Receipts, rewards and account alerts will show up here.
            </p>
          </div>
        )}

        {grouped.map((g) => (
          <section key={g.day} className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo/40">{g.day}</p>
            <div className="overflow-hidden rounded-2xl border border-indigo/10 bg-white">
              {g.items.map((n, i) => {
                const meta = KIND_META[n.kind] ?? { icon: "🔔", label: "Other" };
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${
                      i > 0 ? "border-t border-indigo/5" : ""
                    } ${n.read_at ? "" : "bg-konek-green/5"}`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-lg">
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${n.read_at ? "font-medium text-indigo/80" : "font-semibold text-indigo"}`}>
                          {n.title ?? meta.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-indigo/40">{timeOf(n.created_at)}</span>
                      </span>
                      {n.body && <span className="mt-0.5 block text-sm leading-snug text-indigo/55">{n.body}</span>}
                    </span>
                    {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-konek-green" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <Link href="/settings/preferences" className="mt-2 block rounded-3xl bg-indigo/5 p-5">
          <h3 className="font-bold text-indigo">Notification preferences →</h3>
          <p className="mt-1 text-sm text-indigo/60">
            Choose which alerts you get — transactions, security and promotions.
          </p>
        </Link>
      </div>
    </main>
  );
}
