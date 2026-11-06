"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Step {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
}
interface Status {
  steps: Step[];
  pct: number;
  doneCount: number;
  total: number;
  complete: boolean;
}

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Complete your setup" backHref="/home" />
      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Progress hero */}
        <div className="mb-6 rounded-3xl bg-indigo p-6 text-white">
          <p className="text-sm text-white/60">Account setup</p>
          <p className="mt-1 font-heading text-3xl font-bold">{status ? `${status.pct}%` : "—"}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-raviion-green transition-all" style={{ width: `${status?.pct ?? 0}%` }} />
          </div>
          {status?.complete && <p className="mt-3 text-sm text-raviion-green">🎉 You&rsquo;re all set!</p>}
        </div>

        {status === null ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-indigo/5" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {status.steps.map((s, i) => (
              <Link
                key={s.key}
                href={s.href}
                className={`raviion-tile flex items-center gap-4 rounded-2xl border px-4 py-4 ${
                  s.done ? "border-raviion-green/20 bg-raviion-green/5" : "border-indigo/10 bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    s.done ? "bg-raviion-green text-white" : "bg-indigo/10 text-indigo"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${s.done ? "text-indigo/70 line-through" : "text-indigo"}`}>
                    {s.label}
                  </span>
                  <span className="block text-xs text-indigo/55">{s.description}</span>
                </span>
                {!s.done && <span className="shrink-0 text-xs font-semibold text-raviion-green">Do it →</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
