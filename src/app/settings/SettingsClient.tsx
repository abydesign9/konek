"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { IconChevronRight } from "@/components/icons";

type PinStep = "closed" | "current" | "new" | "confirm";

function ChangePinCard() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<PinStep>("closed");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep("closed");
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function submit(finalConfirm: string) {
    if (finalConfirm !== next) {
      setError("New PINs didn't match — start again");
      setCurrent("");
      setNext("");
      setConfirm("");
      setStep("current");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/auth/pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: current, newPin: next }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to change PIN");
      setStep("current");
      setCurrent("");
      setNext("");
      setConfirm("");
      return;
    }
    setSuccess(true);
    setTimeout(reset, 1500);
  }

  useEffect(() => {
    fetch("/api/auth/pin")
      .then((r) => r.json())
      .then((d) => setHasPin(Boolean(d.hasPin)));
  }, []);

  if (hasPin === false) {
    return (
      <Link
        href="/settings/pin"
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
      >
        <span className="text-sm font-semibold text-indigo">Set up your transaction PIN</span>
        <IconChevronRight className="h-4 w-4 text-indigo/30" />
      </Link>
    );
  }

  if (step === "closed") {
    return (
      <button
        onClick={() => setStep("current")}
        disabled={hasPin === null}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile disabled:opacity-50"
      >
        <span className="text-sm font-semibold text-indigo">Change transaction PIN</span>
        <IconChevronRight className="h-4 w-4 text-indigo/30" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white px-5 py-6 konek-card-shadow">
      {success ? (
        <p className="text-center text-sm font-semibold text-konek-green">PIN updated ✓</p>
      ) : (
        <>
          <p className="mb-4 text-center text-sm font-semibold text-indigo">
            {step === "current" && "Enter your current PIN"}
            {step === "new" && "Choose a new PIN"}
            {step === "confirm" && "Confirm your new PIN"}
          </p>
          {step === "current" && (
            <PinPad value={current} onChange={setCurrent} onComplete={() => setStep("new")} />
          )}
          {step === "new" && (
            <PinPad value={next} onChange={setNext} onComplete={() => setStep("confirm")} />
          )}
          {step === "confirm" && <PinPad value={confirm} onChange={setConfirm} onComplete={submit} />}
          {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
          {saving && <p className="mt-3 text-center text-xs text-indigo/50">Saving…</p>}
          <button onClick={reset} className="mt-4 w-full text-center text-xs text-indigo/50">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

function CloseAccountCard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  async function submit(finalPin: string) {
    setClosing(true);
    setError(null);
    const res = await fetch("/api/account/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: finalPin }),
    });
    setClosing(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to close account");
      setPin("");
      return;
    }
    router.push("/login");
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-center text-sm font-semibold text-red-600"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
      <p className="mb-1 text-center text-sm font-semibold text-red-700">This closes your account for good</p>
      <p className="mb-4 text-center text-xs text-red-600/80">
        Your wallet must be at ₦0 / $0 first. Enter your PIN to confirm.
      </p>
      <PinPad value={pin} onChange={setPin} onComplete={submit} />
      {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
      {closing && <p className="mt-3 text-center text-xs text-red-600/70">Closing…</p>}
      <button onClick={() => setConfirming(false)} className="mt-4 w-full text-center text-xs text-indigo/50">
        Cancel
      </button>
    </div>
  );
}

export function SettingsClient() {
  return (
    <main className="min-h-screen bg-background pb-12">
      <PageHeader title="Settings" backHref="/profile" />

      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Security</p>
          <div className="flex flex-col gap-2.5">
            <ChangePinCard />
            <Link
              href="/notifications"
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
            >
              <span className="text-sm font-semibold text-indigo">Notification preferences</span>
              <IconChevronRight className="h-4 w-4 text-indigo/30" />
            </Link>
            <Link
              href="/privacy"
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
            >
              <span className="text-sm font-semibold text-indigo">Privacy policy</span>
              <IconChevronRight className="h-4 w-4 text-indigo/30" />
            </Link>
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600/60">Danger zone</p>
          <CloseAccountCard />
        </section>
      </div>
    </main>
  );
}
