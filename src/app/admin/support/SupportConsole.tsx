"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Grid, PageHeader } from "@/components/adminUi";

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

const PRIORITY_TONE: Record<string, "indigo" | "gold" | "red"> = {
  low: "indigo",
  medium: "indigo",
  high: "gold",
  urgent: "red",
};

const STATUS_TONE: Record<string, "gold" | "indigo" | "green" | "neutral"> = {
  open: "gold",
  assigned: "indigo",
  waiting_on_customer: "gold",
  resolved: "green",
  closed: "neutral",
};

function isOverdue(t: TicketRow): boolean {
  return !!t.sla_due_at && new Date(t.sla_due_at) < new Date() && !["resolved", "closed"].includes(t.status);
}

function StatBox({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${danger && Number(value) > 0 ? "border-red-200 bg-red-50" : "border-border-soft bg-white"}`}>
      <p className="text-[11px] text-text-secondary">{label}</p>
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
  // Resolve directly. If the agent typed a reply, send it and resolve in one go;
  // otherwise just mark the ticket resolved (never leaves it awaiting customer).
  async function resolveTicket() {
    if (!selectedId) return;
    if (replyText.trim()) {
      await sendReply(true);
      return;
    }
    await fetch(`/api/admin/support/${selectedId}/resolve`, { method: "POST" });
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
      <PageHeader title="Customer support" description="Tickets, assignment, and the help center." />

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Open" value={stats.open} />
          <StatBox label="Assigned" value={stats.assigned} />
          <StatBox label="Awaiting reply" value={stats.waitingOnCustomer} />
          <StatBox label="Resolved" value={stats.resolved} />
          <StatBox label="SLA breached" value={stats.slaBreached} danger />
        </div>
      )}

      <Grid className="mb-8">
        {/* Ticket list — left column */}
        <div className="col-span-1 lg:col-span-5">
          <Card
            title="Tickets"
            padding={false}
            action={
              <div className="flex gap-1.5 p-1">
                {BUCKET_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setBucket(t.id);
                      setSelectedId(null);
                      setThread(null);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      bucket === t.id ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
            className="flex h-full flex-col"
          >
            <div className="flex max-h-[720px] flex-col gap-2 overflow-y-auto p-6 pt-0">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    selectedId === t.id ? "border-indigo/40 bg-indigo/5" : "border-border-soft bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-indigo">
                      {t.phone} · {t.subject}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isOverdue(t) && <Badge tone="red">SLA</Badge>}
                      <Badge tone={PRIORITY_TONE[t.priority] ?? "indigo"} uppercase>
                        {t.priority}
                      </Badge>
                    </div>
                  </div>
                  <p className="mb-1 truncate text-xs text-text-secondary">{t.body}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status.replace(/_/g, " ")}</Badge>
                    {t.category && <span className="text-[10px] text-text-secondary">{t.category}</span>}
                    {t.assigned_admin_email && <span className="text-[10px] text-text-secondary">· {t.assigned_admin_email}</span>}
                  </div>
                </button>
              ))}
              {tickets.length === 0 && <EmptyState message="No tickets in this view." />}
            </div>
          </Card>
        </div>

        {/* Ticket detail — right column */}
        <div className="col-span-1 lg:col-span-7">
          {!thread ? (
            <Card className="flex h-full items-center justify-center">
              <EmptyState message="Select a ticket to see the thread, notes, and timeline." />
            </Card>
          ) : (
            <Card title={thread.message.subject}>
              <div className="mb-4 flex flex-wrap gap-2">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border-soft px-2 py-1.5 text-xs">
                  {["kyc", "payments", "vtu", "esim", "card", "dollar_account", "other"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-border-soft px-2 py-1.5 text-xs">
                  {["low", "medium", "high", "urgent"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button onClick={saveCategoryPriority} className="rounded-lg bg-indigo/10 px-3 py-1.5 text-xs font-semibold text-indigo">
                  Save
                </button>
                <button onClick={assignToMe} className="rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white">
                  Assign to me
                </button>
                {thread.message.status === "resolved" && (
                  <button onClick={closeTicket} className="rounded-lg bg-indigo/10 px-3 py-1.5 text-xs font-semibold text-indigo">
                    Close ticket
                  </button>
                )}
              </div>

              <div className="mb-4 flex flex-col gap-2">
                <div className="rounded-xl bg-indigo/5 px-3 py-2 text-sm text-indigo">{thread.message.body}</div>
                {thread.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      r.author_type === "admin" ? "self-start bg-raviion-green/10 text-indigo" : "ml-auto self-end bg-indigo text-white"
                    }`}
                  >
                    {r.body}
                  </div>
                ))}
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to the customer…"
                  className="flex-1 rounded-lg border border-border-soft px-3 py-2 text-sm"
                />
                <button onClick={() => sendReply(false)} className="rounded-lg bg-indigo px-3 text-xs font-semibold text-white">
                  Reply
                </button>
                <button onClick={resolveTicket} className="rounded-lg bg-raviion-green px-3 text-xs font-semibold text-white">
                  Resolve
                </button>
              </div>

              <p className="mb-2 text-xs font-semibold text-text-secondary">Internal notes (not visible to customer)</p>
              <div className="mb-2 flex flex-col gap-1.5">
                {thread.notes.map((n) => (
                  <p key={n.id} className="rounded-lg bg-gold/10 px-2.5 py-1.5 text-xs text-text-secondary">
                    <span className="font-semibold">{n.admin_email}:</span> {n.body}
                  </p>
                ))}
              </div>
              <div className="mb-4 flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note…"
                  className="flex-1 rounded-lg border border-border-soft px-3 py-2 text-sm"
                />
                <button onClick={addNote} className="rounded-lg bg-gold px-3 text-xs font-semibold text-white">
                  Add
                </button>
              </div>

              <p className="mb-2 text-xs font-semibold text-text-secondary">Status timeline</p>
              <div className="flex flex-col gap-1">
                {thread.timeline.map((e, i) => (
                  <p key={i} className="text-xs text-text-secondary">
                    {e.from_status ? `${e.from_status} → ` : ""}
                    {e.to_status.replace(/_/g, " ")} · {e.actor_type} · {new Date(e.created_at).toLocaleString()}
                  </p>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Grid>

      <Card
        title="Knowledge base"
        action={
          <button onClick={() => setShowFaqForm((s) => !s)} className="text-xs font-semibold text-raviion-green">
            {showFaqForm ? "Cancel" : "New article"}
          </button>
        }
      >
        {showFaqForm && (
          <div className="mb-4 rounded-2xl border border-border-soft p-4">
            <select value={faqCategory} onChange={(e) => setFaqCategory(e.target.value)} className="mb-2 w-full rounded-lg border border-border-soft px-3 py-2 text-sm">
              {["general", "kyc", "payments", "vtu", "esim", "card", "dollar_account"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="Question"
              className="mb-2 w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
            />
            <textarea
              value={faqAnswer}
              onChange={(e) => setFaqAnswer(e.target.value)}
              placeholder="Answer"
              rows={3}
              className="mb-2 w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
            />
            <button onClick={createFaq} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white">
              Publish
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-border-soft px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-indigo">{f.question}</p>
                <Badge tone={f.published ? "green" : "neutral"}>{f.published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mb-2 text-xs text-text-secondary">{f.answer}</p>
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
          {faqs.length === 0 && <EmptyState message="No articles yet." />}
        </div>
      </Card>
    </>
  );
}
