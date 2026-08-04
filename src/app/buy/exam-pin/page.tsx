"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";

interface Plan {
  id: string;
  external_id: string;
  name: string;
  price_minor: string;
  network: string;
}

const MAX_QTY = 5;

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString()}`;
}

export default function ExamPinPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [candidate, setCandidate] = useState("");
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pins, setPins] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/catalog?serviceType=exam_pin")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, []);

  const total = selected ? Number(selected.price_minor) * qty : 0;

  function proceed() {
    if (!selected) return setError("Select an exam PIN");
    if (!candidate) return setError("Enter candidate number / phone");
    setError("");
    setShowPin(true);
  }

  // Each PIN is a discrete purchase (its own transaction, code and receipt), so
  // we buy them sequentially with unique idempotency keys and report how many
  // succeeded — a partial failure never double-charges the ones that worked.
  async function submit(finalPin: string) {
    setLoading(true);
    setError("");
    const codes: string[] = [];
    for (let i = 0; i < qty; i++) {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "exam_pin",
          network: selected!.network,
          phone: candidate,
          planExternalId: selected!.external_id,
          pin: finalPin,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 428) {
        setLoading(false);
        router.push(`/settings/pin?next=${encodeURIComponent("/buy/exam-pin")}`);
        return;
      }
      if (redirectIfKycGate(res, data)) return;
      if (!res.ok || data.status === "failed") {
        setLoading(false);
        if (codes.length === 0) {
          setError(data.error ?? "Purchase failed. No funds were charged.");
          setShowPin(false);
          return;
        }
        // Some succeeded — stop and show what we got.
        setPins(codes);
        return;
      }
      if (data.token) codes.push(data.token);
    }
    setLoading(false);
    setPins(codes);
  }

  if (pins) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl border border-indigo/10 bg-white p-8 text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="text-xl font-bold text-indigo">
            {pins.length} exam PIN{pins.length === 1 ? "" : "s"} generated
          </h1>
          <div className="mt-4 space-y-2 text-left">
            {pins.map((code, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-indigo/5 px-3 py-2">
                <code className="text-sm text-indigo">{code}</code>
                <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs font-semibold text-konek-green">
                  Copy
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/home")} className="mt-6 w-full rounded-xl bg-indigo px-8 py-3 font-semibold text-white">
            Done
          </button>
        </div>
      </main>
    );
  }

  if (showPin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h1 className="mb-1 text-center text-lg font-bold text-indigo">
            {qty} × {selected?.name}
          </h1>
          <p className="mb-6 text-center text-sm text-indigo/60">{money(total)} total</p>
          <PinPad value={pin} onChange={setPin} onComplete={submit} />
          {loading && <p className="mt-4 text-center text-sm text-indigo/50">Buying {qty} pin{qty === 1 ? "" : "s"}…</p>}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          <button onClick={() => { setShowPin(false); setPin(""); }} className="mt-6 block mx-auto text-sm text-indigo/60 underline">
            Cancel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Exam pins" backHref="/connect" />
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="mb-5 text-sm text-indigo/60">WAEC, NECO, JAMB and more — buy up to {MAX_QTY} pins per order.</p>

        <label className="mb-2 block text-sm font-semibold text-indigo">Exam body</label>
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan)}
              className={`w-full rounded-2xl border p-4 text-left ${
                selected?.id === plan.id ? "border-konek-green bg-konek-green/10" : "border-indigo/15 bg-white"
              }`}
            >
              <div className="flex justify-between">
                <span className="font-semibold text-indigo">{plan.name}</span>
                <span className="font-bold text-indigo">{money(Number(plan.price_minor))}</span>
              </div>
            </button>
          ))}
        </div>

        <label className="mb-2 mt-6 block text-sm font-semibold text-indigo">Quantity (1–{MAX_QTY})</label>
        <div className="flex items-center justify-between rounded-2xl border border-indigo/15 bg-white px-4 py-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="konek-tile flex h-9 w-9 items-center justify-center rounded-full bg-indigo/10 text-lg font-bold text-indigo active:scale-90"
          >
            −
          </button>
          <span className="font-heading text-lg font-bold text-indigo">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            className="konek-tile flex h-9 w-9 items-center justify-center rounded-full bg-indigo/10 text-lg font-bold text-indigo active:scale-90"
          >
            +
          </button>
        </div>
        <p className="mt-1.5 text-xs text-indigo/50">Maximum {MAX_QTY} pins per order.</p>

        <label className="mb-2 mt-6 block text-sm font-semibold text-indigo">Candidate number / phone</label>
        <input
          value={candidate}
          onChange={(e) => setCandidate(e.target.value)}
          placeholder="Candidate number / phone"
          className="w-full rounded-xl border border-indigo/20 px-4 py-3"
        />

        <button onClick={proceed} className="mt-8 w-full rounded-2xl bg-indigo py-3.5 font-semibold text-white">
          {selected ? `Continue · ${money(total)}` : "Continue"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
