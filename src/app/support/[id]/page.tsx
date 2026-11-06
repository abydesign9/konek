"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/format";

interface Message {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}
interface Reply {
  id: string;
  author_type: "user" | "admin";
  body: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

export default function SupportThreadPage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/support/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message);
        setReplies(data.replies ?? []);
      });
  }

  useEffect(load, [params.id]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/support/${params.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setReply("");
    load();
  }

  if (!message) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="Support" backHref="/support" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title={message.subject} backHref="/support" backLabel="Support" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-indigo/10 text-indigo px-2.5 py-1 text-xs font-semibold">
            {STATUS_LABEL[message.status] ?? message.status}
          </span>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-indigo/10 px-4 py-3 self-start max-w-[85%]">
            <p className="text-sm text-indigo">{message.body}</p>
            <p className="text-[11px] text-indigo/40 mt-1">{formatDateTime(message.created_at)}</p>
          </div>
          {replies.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                r.author_type === "admin"
                  ? "bg-raviion-green/10 border border-raviion-green/20 self-start"
                  : "bg-indigo text-white self-end"
              }`}
            >
              <p className={`text-sm ${r.author_type === "admin" ? "text-indigo" : "text-white"}`}>{r.body}</p>
              <p className={`text-[11px] mt-1 ${r.author_type === "admin" ? "text-indigo/40" : "text-white/60"}`}>
                {r.author_type === "admin" ? "raviion support" : "You"} · {formatDateTime(r.created_at)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || !reply.trim()}
            className="shrink-0 rounded-xl bg-indigo text-white font-semibold px-5 text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </main>
  );
}
