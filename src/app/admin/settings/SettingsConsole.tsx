"use client";

import { useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

export function SettingsConsole() {
  const [currentSecret, setCurrentSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [secretSaving, setSecretSaving] = useState(false);
  const [secretMsg, setSecretMsg] = useState<string | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [resetPhone, setResetPhone] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function changePassword() {
    setPwMsg(null);
    if (newPw.length < 10) return setPwMsg("New password must be at least 10 characters");
    if (newPw !== confirmPw) return setPwMsg("New password and confirmation don't match");
    setPwSaving(true);
    const res = await fetch("/api/admin/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: curPw, newPassword: newPw }),
    });
    setPwSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setPwMsg(body.error ?? "Failed to change password");
    setPwMsg("Password updated. Use it to log in from now on.");
    setCurPw("");
    setNewPw("");
    setConfirmPw("");
  }

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
        description="Each admin now signs in with their own password. Set or change yours below. The shared secret still works only until you set a password, and stays as the server key that signs admin sessions. Customers authenticate with a transaction PIN, so 'reset customer password' resets that PIN instead."
      />

      <Grid>
        <div className="col-span-1 lg:col-span-6">
          <Card title="Change my password" description="Your personal admin login. If you have not set one yet, enter the shared secret as the current credential.">
            <div className="flex flex-col gap-3">
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="Current password (or shared secret)"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (min 10 characters)"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo"
              />
              <button
                onClick={changePassword}
                disabled={pwSaving}
                className="self-start rounded-xl bg-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pwSaving ? "Saving…" : "Update password"}
              </button>
              {pwMsg && <p className="text-xs text-text-secondary">{pwMsg}</p>}
            </div>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-6">
          <Card title="Change shared secret" description="The bootstrap/fallback credential and the session-signing key. Requires the current secret.">
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
