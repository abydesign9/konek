"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Call {
  to_number: string;
  duration_seconds: number;
  cost_minor: string;
  billed_minutes_from_bundle: number;
  status: string;
}

export default function VoicePage() {
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [calls, setCalls] = useState<Call[]>([]);

  function load() {
    fetch("/api/voice/me")
      .then((res) => res.json())
      .then((data) => {
        setMinutesRemaining(data.minutesRemaining ?? 0);
        setCalls(data.calls ?? []);
      });
  }

  useEffect(load, []);

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Voice" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-indigo/60 mb-6">Free minutes as a loyalty perk — earn more by topping up ₦2,000+.</p>

        <div className="rounded-2xl bg-indigo px-5 py-4 text-white mb-6">
          <p className="text-xs text-white/60 mb-1">Free minutes remaining</p>
          <p className="font-heading text-2xl font-bold">{minutesRemaining} min</p>
        </div>

        <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
          <p className="text-sm font-semibold text-indigo mb-1">Calling is coming soon</p>
          <p className="text-xs text-indigo/60">
            Your free minutes are banked and ready. In-app calling will switch on once the voice provider is live.
          </p>
        </div>

        <p className="text-sm text-indigo/60 mb-3">Call log</p>
        <div className="flex flex-col gap-2 mb-8">
          {calls.map((c, i) => (
            <div key={i} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
              <p className="text-sm text-indigo">{c.to_number}</p>
              <p className="text-xs text-indigo/60">
                {Math.round(c.duration_seconds / 60)} min · {c.billed_minutes_from_bundle} free
                {Number(c.cost_minor) > 0 && ` · ₦${(Number(c.cost_minor) / 100).toLocaleString()} charged`}
              </p>
            </div>
          ))}
          {calls.length === 0 && <p className="text-sm text-indigo/50">No calls yet.</p>}
        </div>
      </div>
    </main>
  );
}
