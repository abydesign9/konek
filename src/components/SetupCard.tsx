"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Status {
  pct: number;
  doneCount: number;
  total: number;
  complete: boolean;
}

// A circular progress ring built with an SVG stroke-dashoffset — no library.
function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(31,56,100,0.12)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#00C48C"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="32" y="36" textAnchor="middle" className="fill-indigo font-heading text-[13px] font-bold">
        {pct}%
      </text>
    </svg>
  );
}

// "Complete your setup" card for Home (Plug.ng-style). Hides itself once the
// checklist is 100% done, so it never nags a fully set-up user.
export function SetupCard() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  if (!status || status.complete) return null;

  return (
    <section className="px-5">
      <Link
        href="/setup"
        className="konek-tile flex items-center gap-4 rounded-2xl border border-konek-green/20 bg-konek-green/5 px-5 py-4"
      >
        <Ring pct={status.pct} />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base font-bold text-indigo">Complete your setup</p>
          <p className="mt-0.5 text-sm text-indigo/60">
            {status.doneCount} of {status.total} done — finish in a few seconds.
          </p>
        </div>
        <span className="text-indigo/40">→</span>
      </Link>
    </section>
  );
}
