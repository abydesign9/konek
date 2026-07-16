"use client";

import { useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

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
      <PageHeader
        title="Settings"
        description="Konek admins share one secret (plus an allowlisted email) rather than individual passwords — this is where you rotate it. Customers authenticate with a transaction PIN, not a password, so “reset customer password” resets that PIN instead."
      />

      <Grid>
        <div className="col-span-1 lg:col-span-6">
          <Card title="Change admin secret" description="Requires the current secret. Every admin will need the new one to log in afterwards.">
            <div className="flex flex-col gap-3">
              <input
                type="password"
                value={currentSecret}
                onChange={(e) => setCurrentSecret(e.target.value)}
                placeholder="Current secret"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <input
                type="password"
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                placeholder="New secret (min 12 characters)"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <input
                type="password"
                value={confirmSecret}
                onChange={(e) => setConfirmSecret(e.target.value)}
                placeholder="Confirm new secret"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <button
                onClick={rotateSecret}
                disabled={secretSaving}
                className="self-start rounded-xl bg-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {secretSaving ? "Saving…" : "Update secret"}
              </button>
              {secretMsg && <p className="text-xs text-text-secondary">{secretMsg}</p>}
            </div>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-6">
          <Card
            title="Reset a customer's PIN"
            description="Clears their transaction PIN — they'll set a new one the next time they buy something. Use this if a customer reports a lost or compromised PIN."
          >
            <div className="flex flex-col gap-3">
              <input
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                placeholder="+2348012345678"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <button
                onClick={resetCustomerPin}
                disabled={resetting}
                className="self-start rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset PIN"}
              </button>
              {resetMsg && <p className="text-xs text-text-secondary">{resetMsg}</p>}
            </div>
          </Card>
        </div>
      </Grid>
    </>
  );
}
