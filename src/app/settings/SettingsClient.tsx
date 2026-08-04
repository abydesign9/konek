"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { IconChevronRight } from "@/components/icons";

type PinStep = "closed" | "current" | "new" | "confirm" | "otp";

// Requests an email OTP for a sensitive change. Returns the demo code when real
// email delivery isn't configured (dev), so the flow stays testable.
async function requestChangeOtp(purpose: "change_pin" | "change_password"): Promise<string | null> {
  const res = await fetch("/api/auth/email-otp/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not send a verification code");
  return typeof data.demoOtp === "string" ? data.demoOtp : null;
}

function ChangePinCard() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<PinStep>("closed");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep("closed");
    setCurrent("");
    setNext("");
    setConfirm("");
    setOtp("");
    setDemoOtp(null);
    setError(null);
  }

  // After the new PIN is confirmed, email a code and move to the OTP step.
  async function confirmed(finalConfirm: string) {
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
    try {
      setDemoOtp(await requestChangeOtp("change_pin"));
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a verification code");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/auth/pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: current, newPin: next, otp }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to change PIN");
      setOtp("");
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
            {step === "otp" && "Enter the code we emailed you"}
          </p>
          {step === "current" && (
            <PinPad value={current} onChange={setCurrent} onComplete={() => setStep("new")} />
          )}
          {step === "new" && (
            <PinPad value={next} onChange={setNext} onComplete={() => setStep("confirm")} />
          )}
          {step === "confirm" && <PinPad value={confirm} onChange={setConfirm} onComplete={confirmed} />}
          {step === "otp" && (
            <OtpEntry
              value={otp}
              onChange={setOtp}
              onSubmit={submit}
              demoOtp={demoOtp}
              submitting={saving}
            />
          )}
          {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
          {saving && step !== "otp" && <p className="mt-3 text-center text-xs text-indigo/50">Saving…</p>}
          <button onClick={reset} className="mt-4 w-full text-center text-xs text-indigo/50">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// Shared 6-digit code entry for OTP-gated changes. Surfaces the demo code
// inline when real email delivery isn't configured yet (dev).
function OtpEntry({
  value,
  onChange,
  onSubmit,
  demoOtp,
  submitting,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  demoOtp: string | null;
  submitting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        inputMode="numeric"
        autoFocus
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="6-digit code"
        className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-center font-heading text-lg font-bold tracking-[0.3em] text-indigo focus:outline-none focus:ring-2 focus:ring-konek-green"
      />
      {demoOtp && (
        <p className="text-center text-[11px] text-indigo/45">
          Dev mode — email delivery not configured. Code: <span className="font-semibold">{demoOtp}</span>
        </p>
      )}
      <button
        onClick={onSubmit}
        disabled={submitting || value.length < 6}
        className="w-full rounded-xl bg-indigo px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {submitting ? "Saving…" : "Confirm change"}
      </button>
    </div>
  );
}

type PwStep = "closed" | "form" | "otp";

function ChangePasswordCard() {
  const [step, setStep] = useState<PwStep>("closed");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep("closed");
    setCurrent("");
    setNext("");
    setOtp("");
    setDemoOtp(null);
    setError(null);
  }

  async function sendCode() {
    if (!current || next.length < 8) {
      setError("Enter your current password and a new one (8+ characters)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      setDemoOtp(await requestChangeOtp("change_password"));
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a verification code");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next, otp }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to change password");
      setOtp("");
      return;
    }
    setSuccess(true);
    setTimeout(reset, 1500);
  }

  if (step === "closed") {
    return (
      <button
        onClick={() => setStep("form")}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
      >
        <span className="text-sm font-semibold text-indigo">Change password</span>
        <IconChevronRight className="h-4 w-4 text-indigo/30" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white px-5 py-6 konek-card-shadow">
      {success ? (
        <p className="text-center text-sm font-semibold text-konek-green">Password updated ✓</p>
      ) : step === "form" ? (
        <div className="flex flex-col gap-3">
          <p className="mb-1 text-center text-sm font-semibold text-indigo">Change your password</p>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-konek-green"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (8+ characters)"
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-konek-green"
          />
          {error && <p className="text-center text-xs text-red-600">{error}</p>}
          <button
            onClick={sendCode}
            disabled={saving}
            className="w-full rounded-xl bg-indigo px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Sending code…" : "Continue"}
          </button>
          <button onClick={reset} className="w-full text-center text-xs text-indigo/50">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-center text-sm font-semibold text-indigo">Enter the code we emailed you</p>
          <OtpEntry value={otp} onChange={setOtp} onSubmit={submit} demoOtp={demoOtp} submitting={saving} />
          {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
          <button onClick={reset} className="mt-4 w-full text-center text-xs text-indigo/50">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// 2-step verification isn't built yet — this is the config layer readers
// see while that work is scoped, not a fake toggle. Same "honest deferral"
// the notification scheduler and recurring top-up use.
function ComingSoonRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow opacity-70">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-indigo">{label}</span>
        <span className="block text-xs text-indigo/50">{sub}</span>
      </span>
      <span className="shrink-0 rounded-full bg-hover-tint px-2.5 py-1 text-[11px] font-semibold text-indigo/50">
        Coming soon
      </span>
    </div>
  );
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Registers a real platform-authenticator credential (Face ID / Touch ID /
// Windows Hello / Android biometric unlock — whatever the device offers)
// and stores its id server-side. This gates re-entry to the app on this
// device: the browser itself refuses navigator.credentials.get() unless
// the same biometric that created the credential unlocks it. It is not a
// server-verified signature check and does not replace the password —
// see the route's own comment for why that's a deliberately smaller scope.
function BiometricsCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
    fetch("/api/settings/me")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.biometric_enabled)));
  }, []);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Konek" },
          user: { id: userId, name: "konek-user", displayName: "Konek" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("Could not register biometric unlock");
      const credentialId = bufToBase64Url(credential.rawId);

      const res = await fetch("/api/settings/biometrics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, credentialId }),
      });
      if (!res.ok) throw new Error("Could not save biometric setting");
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable biometrics on this device");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    await fetch("/api/settings/biometrics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    setEnabled(false);
    setBusy(false);
  }

  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 konek-card-shadow">
      <div className="flex items-center justify-between">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-indigo">Biometrics</span>
          <span className="block text-xs text-indigo/55">Unlock Konek with Face ID or fingerprint</span>
        </span>
        {!supported ? (
          <span className="shrink-0 rounded-full bg-hover-tint px-2.5 py-1 text-[11px] font-semibold text-indigo/50">
            Not available
          </span>
        ) : enabled === null ? null : enabled ? (
          <button
            onClick={disable}
            disabled={busy}
            className="shrink-0 rounded-full bg-hover-tint px-3 py-1.5 text-xs font-semibold text-indigo disabled:opacity-50"
          >
            {busy ? "…" : "Turn off"}
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={busy}
            className="shrink-0 rounded-full bg-indigo px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Turn on"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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
        Close account
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
      <PageHeader title="Privacy and security" backHref="/profile" />

      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Transaction PIN</p>
          <div className="flex flex-col gap-2.5">
            <ChangePinCard />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Password</p>
          <div className="flex flex-col gap-2.5">
            <ChangePasswordCard />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Extra protection</p>
          <div className="flex flex-col gap-2.5">
            <ComingSoonRow label="2-step verification" sub="Confirm sign-in with a one-time code" />
            <BiometricsCard />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Devices</p>
          <Link
            href="/settings/sessions"
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-indigo">Device and session management</span>
              <span className="block text-xs text-indigo/55">See where you&apos;re signed in and sign out other devices</span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-indigo/30" />
          </Link>
        </section>

        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo/40">Legal</p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/settings/privacy"
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
            >
              <span className="text-sm font-semibold text-indigo">Privacy policy</span>
              <IconChevronRight className="h-4 w-4 text-indigo/30" />
            </Link>
            <Link
              href="/settings/terms"
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 konek-card-shadow konek-tile"
            >
              <span className="text-sm font-semibold text-indigo">Terms of service</span>
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
