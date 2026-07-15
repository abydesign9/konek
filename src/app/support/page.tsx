"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

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
  resolved: "Resolved",
};
const STATUS_CLASS: Record<string, string> = {
  open: "bg-gold/15 text-gold",
  in_progress: "bg-indigo/10 text-indigo",
  resolved: "bg-konek-green/15 text-konek-green",
};

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
      body: JSON.stringify({ subject, body }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setSubject("");
    setBody("");
    setShowForm(false);
    load();
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Support"
        backHref="/notifications"
        right={
          <button onClick={() => setShowForm((s) => !s)} className="text-sm font-semibold text-konek-green">
            {showForm ? "Cancel" : "New"}
          </button>
        }
      />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-indigo/60 mb-6">
          Send us a message and we&rsquo;ll reply here. For urgent issues, email{" "}
          <a href="mailto:support@konek.app" className="text-indigo underline">support@konek.app</a>.
        </p>

        {showForm && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
            <label className="block text-sm text-indigo/60 mb-2">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Airtime purchase failed"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
            />
            <label className="block text-sm text-indigo/60 mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Tell us what happened…"
              className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-4"
            />
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send"}
            </button>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </div>
        )}

        {messages === null && <p className="text-sm text-indigo/50">Loading…</p>}
        {messages !== null && messages.length === 0 && !showForm && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-6 text-center">
            <p className="text-sm text-indigo/60 mb-4">No support requests yet.</p>
            <button onClick={() => setShowForm(true)} className="rounded-xl bg-indigo text-white font-semibold px-5 py-2.5 text-sm">
              Contact support
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {messages?.map((m) => (
            <Link
              key={m.id}
              href={`/support/${m.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-indigo/10 bg-white px-4 py-3 hover:border-indigo/25"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo truncate">{m.subject}</p>
                <p className="text-xs text-indigo/50 truncate">{m.body}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_CLASS[m.status] ?? ""}`}>
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
