"use client";

import { useEffect, useState } from "react";

interface Stats {
  total: number;
  open: number;
  assigned: number;
  waitingOnCustomer: number;
  resolved: number;
  closed: number;
  slaBreached: number;
  byPriority: Record<string, number>;
}

interface TicketRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  category: string | null;
  priority: string;
  sla_due_at: string | null;
  phone: string;
  assigned_admin_email: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  author_type: "user" | "admin";
  body: string;
  created_at: string;
}
interface Note {
  id: string;
  admin_email: string;
  body: string;
  created_at: string;
}
interface TimelineEvent {
  from_status: string | null;
  to_status: string;
  actor_type: string;
  created_at: string;
}
interface Thread {
  message: TicketRow;
  replies: Reply[];
  notes: Note[];
  timeline: TimelineEvent[];
}

interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
}

const BUCKET_TABS = [
  { id: "open_bucket", label: "Open" },
  { id: "closed_bucket", label: "Resolved/Closed" },
  { id: "", label: "All" },
];

const PRIORITY_CLASS: Record<string, string> = {
  low: "bg-indigo/10 text-indigo/60",
  medium: "bg-indigo/10 text-indigo",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-gold/15 text-gold",
  assigned: "bg-indigo/10 text-indigo",
  waiting_on_customer: "bg-gold/15 text-gold",
  resolved: "bg-konek-green/15 text-konek-green",
  closed: "bg-indigo/10 text-indigo/50",
};

function isOverdue(t: TicketRow): boolean {
  return !!t.sla_due_at && new Date(t.sla_due_at) < new Date() && !["resolved", "closed"].includes(t.status);
}

function StatBox({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${danger && Number(value) > 0 ? "border-red-200 bg-red-50" : "border-indigo/10 bg-white"}`}>
      <p className="text-[11px] text-indigo/50">{label}</p>
      <p className={`font-heading text-lg font-bold ${danger && Number(value) > 0 ? "text-red-600" : "text-indigo"}`}>{value}</p>
    </div>
  );
}

export function SupportConsole() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [bucket, setBucket] = useState("open_bucket");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqCategory, setFaqCategory] = useState("general");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  function loadStats() {
    fetch("/api/admin/support/stats").then((r) => r.json()).then(setStats);
  }
  function loadTickets() {
    fetch(`/api/admin/support?status=${bucket}`)
      .then((r) => r.json())
      .then((d) => setTickets(d.messages ?? []));
  }
  function loadThread(id: string) {
    fetch(`/api/admin/support/${id}`)
      .then((r) => r.json())
      .then((d: Thread) => {
        setThread(d);
        setCategory(d.message.category ?? "other");
        setPriority(d.message.priority);
      });
  }
  function loadFaqs() {
    fetch("/api/admin/faqs").then((r) => r.json()).then((d) => setFaqs(d.faqs ?? []));
  }

  useEffect(loadStats, []);
  useEffect(loadTickets, [bucket]);
  useEffect(loadFaqs, []);
  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId]);

  function refreshAll() {
    loadStats();
    loadTickets();
    if (selectedId) loadThread(selectedId);
  }

  async function assignToMe() {
    if (!selectedId) return;
    await fetch(`/api/admin/support/${selectedId}/assign`, { method: "POST" });
    refreshAll();
  }
  async function saveCategoryPriority() {
    if (!selectedId) return;
    await fetch(`/api/admin/support/${selectedId}/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, priority }),
    });
    refreshAll();
  }
  async function sendReply(resolve: boolean) {
    if (!selectedId || !replyText.trim()) return;
    await fetch(`/api/admin/support/${selectedId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText, resolve }),
    });
    setReplyText("");
    refreshAll();
  }
  async function addNote() {
    if (!selectedId || !noteText.trim()) return;
    await fetch(`/api/admin/support/${selectedId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    refreshAll();
  }
  async function closeTicket() {
    if (!selectedId) return;
    await fetch(`/api/admin/support/${selectedId}/close`, { method: "POST" });
    refreshAll();
  }

  async function createFaq() {
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: faqCategory, question: faqQuestion, answer: faqAnswer }),
    });
    setFaqQuestion("");
    setFaqAnswer("");
    setShowFaqForm(false);
    loadFaqs();
  }
  async function togglePublish(faq: Faq) {
    await fetch(`/api/admin/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !faq.published }),
    });
    loadFaqs();
  }
  async function removeFaq(id: string) {
    await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    loadFaqs();
  }

  return (
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Customer support</h1>
      <p className="text-sm text-indigo/60 mb-6">Tickets, assignment, and the help center.</p>

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Open" value={stats.open} />
          <StatBox label="Assigned" value={stats.assigned} />
          <StatBox label="Awaiting reply" value={stats.waitingOnCustomer} />
          <StatBox label="Resolved" value={stats.resolved} />
          <StatBox label="SLA breached" value={stats.slaBreached} danger />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {BUCKET_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setBucket(t.id);
              setSelectedId(null);
              setThread(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              bucket === t.id ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={`text-left rounded-xl border px-4 py-3 ${
              selectedId === t.id ? "border-indigo/40 bg-indigo/5" : "border-indigo/10 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-indigo truncate">{t.phone} · {t.subject}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {isOverdue(t) && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700">SLA</span>}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_CLASS[t.priority]}`}>
                  {t.priority}
                </span>
              </div>
            </div>
            <p className="text-xs text-indigo/50 truncate mb-1">{t.body}</p>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[t.status] ?? ""}`}>
                {t.status.replace(/_/g, " ")}
              </span>
              {t.category && <span className="text-[10px] text-indigo/40">{t.category}</span>}
              {t.assigned_admin_email && <span className="text-[10px] text-indigo/40">· {t.assigned_admin_email}</span>}
            </div>
          </button>
        ))}
        {tickets.length === 0 && <p className="text-sm text-indigo/50">No tickets in this view.</p>}
      </div>

      {thread && (
        <section className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-indigo">{thread.message.subject}</p>
            <button onClick={() => setSelectedId(null)} className="text-xs text-indigo/50 underline">
              Close panel
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-indigo/20 px-2 py-1.5 text-xs">
              {["kyc", "payments", "vtu", "esim", "card", "dollar_account", "other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-indigo/20 px-2 py-1.5 text-xs">
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button onClick={saveCategoryPriority} className="rounded-lg bg-indigo/10 text-indigo text-xs font-semibold px-3 py-1.5">
              Save
            </button>
            <button onClick={assignToMe} className="rounded-lg bg-indigo text-white text-xs font-semibold px-3 py-1.5">
              Assign to me
            </button>
            {thread.message.status === "resolved" && (
              <button onClick={closeTicket} className="rounded-lg bg-indigo/10 text-indigo text-xs font-semibold px-3 py-1.5">
                Close ticket
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="rounded-xl bg-indigo/5 px-3 py-2 text-sm text-indigo">{thread.message.body}</div>
            {thread.replies.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl px-3 py-2 text-sm max-w-[90%] ${
                  r.author_type === "admin" ? "bg-konek-green/10 text-indigo self-start" : "bg-indigo text-white self-end ml-auto"
                }`}
              >
                {r.body}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to the customer…"
              className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
            />
            <button onClick={() => sendReply(false)} className="rounded-lg bg-indigo text-white text-xs font-semibold px-3">
              Reply
            </button>
            <button onClick={() => sendReply(true)} className="rounded-lg bg-konek-green text-white text-xs font-semibold px-3">
              Resolve
            </button>
          </div>

          <p className="text-xs font-semibold text-indigo/60 mb-2">Internal notes (not visible to customer)</p>
          <div className="flex flex-col gap-1.5 mb-2">
            {thread.notes.map((n) => (
              <p key={n.id} className="text-xs text-indigo/70 bg-gold/10 rounded-lg px-2.5 py-1.5">
                <span className="font-semibold">{n.admin_email}:</span> {n.body}
              </p>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note…"
              className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
            />
            <button onClick={addNote} className="rounded-lg bg-gold text-white text-xs font-semibold px-3">
              Add
            </button>
          </div>

          <p className="text-xs font-semibold text-indigo/60 mb-2">Status timeline</p>
          <div className="flex flex-col gap-1">
            {thread.timeline.map((e, i) => (
              <p key={i} className="text-xs text-indigo/50">
                {e.from_status ? `${e.from_status} → ` : ""}
                {e.to_status.replace(/_/g, " ")} · {e.actor_type} · {new Date(e.created_at).toLocaleString()}
              </p>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-indigo">Knowledge base</p>
          <button onClick={() => setShowFaqForm((s) => !s)} className="text-xs font-semibold text-konek-green">
            {showFaqForm ? "Cancel" : "New article"}
          </button>
        </div>

        {showFaqForm && (
          <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-4">
            <select value={faqCategory} onChange={(e) => setFaqCategory(e.target.value)} className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2">
              {["general", "kyc", "payments", "vtu", "esim", "card", "dollar_account"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="Question"
              className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2"
            />
            <textarea
              value={faqAnswer}
              onChange={(e) => setFaqAnswer(e.target.value)}
              placeholder="Answer"
              rows={3}
              className="w-full rounded-lg border border-indigo/20 px-3 py-2 text-sm mb-2"
            />
            <button onClick={createFaq} className="rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2">
              Publish
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-indigo truncate">{f.question}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.published ? "bg-konek-green/15 text-konek-green" : "bg-indigo/10 text-indigo/50"}`}>
                  {f.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-xs text-indigo/50 mb-2">{f.answer}</p>
              <div className="flex gap-3">
                <button onClick={() => togglePublish(f)} className="text-xs font-semibold text-indigo underline">
                  {f.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => removeFaq(f.id)} className="text-xs font-semibold text-red-600 underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-sm text-indigo/50">No articles yet.</p>}
        </div>
      </section>
    </>
  );
}
