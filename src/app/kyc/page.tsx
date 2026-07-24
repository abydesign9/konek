"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface MethodOption {
  code: string;
  label: string;
  kind: "number_lookup" | "document" | "biometric" | "address";
}
interface RequirementView {
  tier: number;
  label: string;
  satisfied: boolean;
  missingGroups: { methods: MethodOption[] }[];
}
interface Overview {
  country: string;
  tier: number;
  tierLabel: string;
  verifiedMethods: string[];
  requirements: RequirementView[];
}

const NUMBER_HINT: Record<string, string> = {
  bvn: "11-digit BVN",
  nin: "11-digit NIN",
  ssn_last4: "Last 4 of SSN",
  aadhaar: "12-digit Aadhaar",
};

export default function KycPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busyMethod, setBusyMethod] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    fetch("/api/kyc/overview")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Could not load verification status"));
  }
  useEffect(load, []);

  async function verifyNumber(method: string) {
    const value = (values[method] ?? "").trim();
    if (!value) return;
    setBusyMethod(method);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/kyc/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, value }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyMethod(null);
    if (!res.ok) {
      setError(d.error ?? "Verification failed");
      return;
    }
    setNotice(`Verified. You are now ${d.tier >= 2 ? "fully verified" : "verified"}.`);
    setValues((v) => ({ ...v, [method]: "" }));
    load();
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-indigo/50">{error ?? "Loading verification…"}</p>
      </main>
    );
  }

  const maxTier = data.requirements.reduce((m, r) => Math.max(m, r.tier), 2);
  const progress = maxTier > 0 ? Math.round((data.tier / maxTier) * 100) : 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader title="Verification" backHref="/home" />

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="mb-6 rounded-3xl bg-indigo p-6 text-white">
          <p className="text-sm text-white/60">Your Konek verification · {data.country}</p>
          <h1 className="mt-2 text-2xl font-bold">{data.tierLabel}</h1>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-konek-green transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/70">{progress}% complete</p>
        </div>

        {notice && <p className="mb-4 rounded-xl bg-konek-green/10 px-4 py-3 text-sm font-semibold text-konek-green">{notice}</p>}
        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          <div className="rounded-3xl border border-indigo/10 bg-white p-5">
            <h2 className="font-bold text-indigo">Tier 0 · Browse</h2>
            <p className="mt-1 text-sm text-indigo/60">Explore Konek and manage your account. No verification needed.</p>
          </div>

          {data.requirements
            .sort((a, b) => a.tier - b.tier)
            .map((req) => (
              <div key={req.tier} className="rounded-3xl border border-indigo/10 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-indigo">
                    Tier {req.tier} · {req.label}
                  </h2>
                  <span>{req.satisfied ? "✅" : "🔒"}</span>
                </div>

                {req.satisfied ? (
                  <p className="mt-2 text-sm text-konek-green">Complete</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {req.missingGroups.map((group, gi) => (
                      <div key={gi}>
                        {group.methods.length > 1 && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo/40">Provide any one</p>
                        )}
                        <div className="space-y-2">
                          {group.methods.map((m) => (
                            <MethodRow
                              key={m.code}
                              method={m}
                              value={values[m.code] ?? ""}
                              busy={busyMethod === m.code}
                              onChange={(v) => setValues((s) => ({ ...s, [m.code]: v }))}
                              onSubmit={() => verifyNumber(m.code)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="mt-6 rounded-3xl bg-indigo/5 p-5">
          <h3 className="font-bold text-indigo">Why we ask</h3>
          <p className="mt-1 text-sm text-indigo/60">
            Konek operates across many countries. We only request the IDs your country&apos;s regulator requires, and only
            when a feature needs them. Your details are encrypted.
          </p>
        </div>
      </div>
    </main>
  );
}

function MethodRow({
  method,
  value,
  busy,
  onChange,
  onSubmit,
}: {
  method: MethodOption;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  // Number lookups (BVN/NIN/SSN/Aadhaar) verify inline; documents and biometrics
  // go to their dedicated capture flows.
  if (method.kind === "number_lookup") {
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder={NUMBER_HINT[method.code] ?? method.label}
          className="min-w-0 flex-1 rounded-xl border border-indigo/15 px-4 py-2.5 text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={busy || !value}
          className="shrink-0 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Verify"}
        </button>
      </div>
    );
  }

  const href = method.kind === "biometric" ? "/kyc/identity-checks" : "/kyc/government-upload";
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-indigo/15 px-4 py-3 text-sm font-semibold text-indigo"
    >
      <span>{method.label}</span>
      <span className="text-indigo/40">→</span>
    </Link>
  );
}
