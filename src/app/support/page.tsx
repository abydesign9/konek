"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { CONTACT, SOCIALS, whatsappLink } from "@/lib/contact";

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
  resolved: "bg-raviion-green/15 text-raviion-green",
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

function ContactRow({ icon, title, sub, href, external }: { icon: string; title: string; sub: string; href: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-indigo/[0.03] active:bg-indigo/5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raviion-green/10 text-lg">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{title}</span>
        <span className="block truncate text-xs text-indigo/55">{sub}</span>
      </span>
      <span className="text-indigo/30">›</span>
    </a>
  );
}

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<{ answer: string; needsHumanSupport: boolean; ticketId?: string } | null>(null);

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

  async function askAi() {
    if (!aiQuestion.trim()) {
      setAiError("Ask a quick question and the AI will try to help.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const res = await fetch("/api/support/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: aiQuestion }),
    });
    const data = await res.json().catch(() => ({}));
    setAiLoading(false);
    if (!res.ok) {
      setAiError(data.error ?? "Something went wrong");
      return;
    }
    setAiReply({
      answer: data.answer ?? "I couldn’t give a direct answer yet.",
      needsHumanSupport: !!data.needsHumanSupport,
      ticketId: data.ticketId,
    });
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Help & support" backHref="/profile" />

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Hero */}
        <div className="mb-5 rounded-3xl bg-indigo p-6 text-white">
          <h1 className="font-heading text-xl font-bold">How can we help? 👋</h1>
          <p className="mt-1 text-sm text-white/70">We&rsquo;re here for you — chat, call or send a message.</p>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-raviion-green py-3 text-center font-semibold text-white"
          >
            💬 Live chat on WhatsApp
          </a>
        </div>

        {/* Contact channels */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo/40">raviion customer service</p>
        <div className="mb-6 overflow-hidden rounded-2xl border border-indigo/10 bg-white [&>a+a]:border-t [&>a+a]:border-indigo/5">
          <ContactRow icon="🟢" title="WhatsApp" sub={CONTACT.whatsappNumber} href={whatsappLink()} external />
          <ContactRow icon="📞" title="Call us" sub={CONTACT.phone} href={`tel:${CONTACT.phone}`} />
          <ContactRow icon="✉️" title="Email" sub={CONTACT.email} href={`mailto:${CONTACT.email}`} />
        </div>

        {/* AI quick help */}
        <div className="mb-6 rounded-3xl border border-indigo/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo">Ask raviion AI</p>
            <span className="rounded-full bg-raviion-green/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-raviion-green">
              AI
            </span>
          </div>
          <textarea
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            rows={3}
            placeholder="For example: how do I fund my wallet or why did my airtime purchase fail?"
            className="mb-3 w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm"
          />
          <button
            onClick={askAi}
            disabled={aiLoading}
            className="w-full rounded-xl bg-raviion-green py-3 font-semibold text-white disabled:opacity-50"
          >
            {aiLoading ? "Thinking…" : "Ask AI"}
          </button>
          {aiError && <p className="mt-3 text-sm text-red-600">{aiError}</p>}
          {aiReply && (
            <div className="mt-4 rounded-2xl bg-indigo/5 p-3">
              <p className="text-sm font-semibold text-indigo">AI answer</p>
              <p className="mt-2 text-sm leading-relaxed text-indigo/75">{aiReply.answer}</p>
              {aiReply.needsHumanSupport && (
                <p className="mt-3 text-xs font-medium text-raviion-green">
                  We created a support ticket{aiReply.ticketId ? ` #${aiReply.ticketId.slice(0, 8)}` : ""} for this issue.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick help */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/support/faq" className="raviion-tile rounded-2xl border border-indigo/10 bg-white p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo/5 text-lg">📖</div>
            <p className="text-sm font-semibold text-indigo">Help center</p>
            <p className="text-xs text-indigo/55">FAQs & quick answers</p>
          </Link>
          <button onClick={() => setShowForm(true)} className="raviion-tile rounded-2xl border border-indigo/10 bg-white p-4 text-left">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo/5 text-lg">📝</div>
            <p className="text-sm font-semibold text-indigo">Send a message</p>
            <p className="text-xs text-indigo/55">We reply in-app</p>
          </button>
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
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-indigo/5" />
            ))}
          </div>
        )}
        {messages !== null && messages.length === 0 && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-6 text-center text-sm text-indigo/55">
            No conversations yet — send a message and replies land here.
          </div>
        )}
        {messages !== null && messages.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-indigo/10 bg-white">
            {messages.map((m, i) => (
              <Link
                key={m.id}
                href={`/support/${m.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-indigo/5 ${i > 0 ? "border-t border-indigo/5" : ""}`}
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

        {/* Socials */}
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-indigo/40">Follow raviion</p>
        <div className="raviion-scrollbar-none flex gap-2 overflow-x-auto">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="raviion-tile flex min-w-[72px] flex-col items-center gap-1 rounded-2xl border border-indigo/10 bg-white px-3 py-3"
            >
              <span className="text-lg">{s.icon}</span>
              <span className="text-[11px] font-semibold text-indigo/70">{s.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
