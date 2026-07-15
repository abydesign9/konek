"use client";

import { useState } from "react";

export function SettingsConsole() {
  const [currentSecret, setCurrentSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [secretSaving, setSecretSaving] = useState(false);
  const [secretMsg, setSecretMsg] = useState<string | null>(null);

  const [resetPhone, setResetPhone] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function rotateSecret() {
    setSecretMsg(null);
    if (newSecret.length < 12) {
      setSecretMsg("New secret must be at least 12 characters");
      return;
    }
    if (newSecret !== confirmSecret) {
      setSecretMsg("New secret and confirmation don't match");
      return;
    }
    setSecretSaving(true);
    const res = await fetch("/api/admin/settings/secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentSecret, newSecret }),
    });
    setSecretSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSecretMsg(body.error ?? "Failed to rotate secret");
      return;
    }
    setSecretMsg("Admin secret updated. Every admin must use the new secret to log in from now on.");
    setCurrentSecret("");
    setNewSecret("");
    setConfirmSecret("");
  }

  async function resetCustomerPin() {
    setResetMsg(null);
    if (!resetPhone.trim()) {
      setResetMsg("Enter a customer phone number");
      return;
    }
    setResetting(true);
    const res = await fetch("/api/admin/customers/reset-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: resetPhone.trim() }),
    });
    setResetting(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResetMsg(body.error ?? "Failed to reset PIN");
      return;
    }
    setResetMsg(
      body.hadPin
        ? "PIN cleared — the customer will be asked to set a new one on their next purchase."
        : "That customer never had a PIN set — nothing to reset."
    );
    setResetPhone("");
  }

  return (
    <>
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Settings</h1>
      <p className="text-sm text-indigo/60 mb-6">
        Konek admins share one secret (plus an allowlisted email) rather than individual
        passwords — this is where you rotate it. Customers authenticate with a transaction PIN,
        not a password, so &ldquo;reset customer password&rdquo; resets that PIN instead.
      </p>

      <section className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
        <p className="text-sm font-semibold text-indigo mb-1">Change admin secret</p>
        <p className="text-xs text-indigo/50 mb-4">
          Requires the current secret. Every admin will need the new one to log in afterwards.
        </p>
        <input
          type="password"
          value={currentSecret}
          onChange={(e) => setCurrentSecret(e.target.value)}
          placeholder="Current secret"
          className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-2"
        />
        <input
          type="password"
          value={newSecret}
          onChange={(e) => setNewSecret(e.target.value)}
          placeholder="New secret (min 12 characters)"
          className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-2"
        />
        <input
          type="password"
          value={confirmSecret}
          onChange={(e) => setConfirmSecret(e.target.value)}
          placeholder="Confirm new secret"
          className="w-full rounded-xl border border-indigo/20 px-4 py-2.5 text-sm mb-3"
        />
        <button
          onClick={rotateSecret}
          disabled={secretSaving}
          className="rounded-xl bg-indigo text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {secretSaving ? "Saving…" : "Update secret"}
        </button>
        {secretMsg && <p className="text-xs text-indigo/70 mt-3">{secretMsg}</p>}
      </section>

      <section className="rounded-2xl border border-indigo/10 bg-white p-5">
        <p className="text-sm font-semibold text-indigo mb-1">Reset a customer&rsquo;s PIN</p>
        <p className="text-xs text-indigo/50 mb-4">
          Clears their transaction PIN — they&rsquo;ll set a new one the next time they buy
          something. Use this if a customer reports a lost or compromised PIN.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={resetPhone}
            onChange={(e) => setResetPhone(e.target.value)}
            placeholder="+2348012345678"
            className="w-full sm:flex-1 rounded-xl border border-indigo/20 px-4 py-2.5 text-sm"
          />
          <button
            onClick={resetCustomerPin}
            disabled={resetting}
            className="shrink-0 rounded-xl bg-gold text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Reset PIN"}
          </button>
        </div>
        {resetMsg && <p className="text-xs text-indigo/70 mt-3">{resetMsg}</p>}
      </section>
    </>
  );
}
