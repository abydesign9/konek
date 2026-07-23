"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";

interface SupportMessage {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  assigned: "In progress",
  waiting_on_customer: "Awaiting your reply",
  resolved: "Resolved",
  closed: "Closed",
};
const STATUS_CLASS: Record<string, string> = {
  open: "bg-gold/15 text-gold",
  in_progress: "bg-indigo/10 text-indigo",
  assigned: "bg-indigo/10 text-indigo",
  waiting_on_customer: "bg-gold/15 text-gold",
  resolved: "bg-konek-green/15 text-konek-green",
  closed: "bg-indigo/10 text-indigo/60",
};

const CATEGORIES = [
  { id: "", label: "Choose a topic (optional)" },
  { id: "kyc", label: "Verification" },
  { id: "payments", label: "Payments & wallet" },
  { id: "vtu", label: "Airtime, data & bills" },
  { id: "esim", label: "eSIM" },
  { id: "card", label: "Virtual card" },
  { id: "dollar_account", label: "Dollar account" },
  { id: "other", label: "Something else" },
];

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/support")
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []));
  }

  useEffect(load, []);

  async function submit() {
    if (!subject.trim() || !body.trim()) {
      setError("Enter a subject and a message");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, category: category || undefined }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setSubject("");
    setBody("");
    setCategory("");
    setShowForm(false);
    load();
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Get help" backHref="/profile" />

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Hero */}
        <div className="mb-5 rounded-3xl bg-indigo p-6 text-white">
          <h1 className="font-heading text-xl font-bold">How can we help? 👋</h1>
          <p className="mt-1 text-sm text-white/70">
            We usually reply within a few hours. Start with the quick answers or message us directly.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 w-full rounded-xl bg-white py-3 text-center font-semibold text-indigo"
          >
            Message support
          </button>
        </div>

        {/* Quick help */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/faq" className="konek-tile rounded-2xl border border-indigo/10 bg-white p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo/5 text-lg">📖</div>
            <p className="text-sm font-semibold text-indigo">Help center</p>
            <p className="text-xs text-indigo/55">Instant answers to common questions</p>
          </Link>
          <a href="mailto:support@konek.app" className="konek-tile rounded-2xl border border-indigo/10 bg-white p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo/5 text-lg">✉️</div>
            <p className="text-sm font-semibold text-indigo">Email us</p>
            <p className="text-xs text-indigo/55">support@konek.app for urgent issues</p>
          </a>
        </div>

        {/* New message form */}
        {showForm && (
          <div className="mb-6 rounded-3xl border border-indigo/10 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-indigo">New message</h2>
              <button onClick={() => setShowForm(false)} className="text-sm font-semibold text-indigo/50">
                Cancel
              </button>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mb-3 w-full rounded-xl border border-indigo/20 bg-white px-4 py-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject — e.g. Airtime purchase failed"
              className="mb-3 w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Tell us what happened…"
              className="mb-3 w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm"
            />
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-indigo py-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Conversations */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo/40">Your conversations</p>
        {messages === null && (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-indigo/5" />
            ))}
          </div>
        )}
        {messages !== null && messages.length === 0 && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-6 text-center">
            <p className="text-sm text-indigo/55">
              No conversations yet — message us any time and replies land right here.
            </p>
          </div>
        )}
        {messages !== null && messages.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-indigo/10 bg-white">
            {messages.map((m, i) => (
              <Link
                key={m.id}
                href={`/support/${m.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-indigo/5 ${
                  i > 0 ? "border-t border-indigo/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-indigo">{m.subject}</p>
                  <p className="truncate text-xs text-indigo/50">{m.body}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[m.status] ?? "bg-indigo/10 text-indigo"}`}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
