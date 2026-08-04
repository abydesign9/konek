"use client";

import { useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

export function SettingsConsole() {
  const [resetPhone, setResetPhone] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

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
        ? "PIN cleared. The customer will be asked to set a new one on their next purchase."
        : "That customer never had a PIN set, so there was nothing to reset."
    );
    setResetPhone("");
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Admins sign in with their own Konek account email and password. To change your admin login password, change your Konek account password in the app. To grant someone admin access, add their Konek email under Users & Roles. Customers authenticate with a transaction PIN, which you can reset below."
      />

      <Grid>
        <div className="col-span-1 lg:col-span-6">
          <Card
            title="Admin access"
            description="Admin login is your Konek account (email + password) plus an admin grant."
          >
            <div className="space-y-2 text-sm text-text-secondary">
              <p>1. The person signs up on Konek with the email that should be an admin.</p>
              <p>2. A super admin adds that email under Users &amp; Roles and picks a role.</p>
              <p>3. They log in at /admin with the same email and password they use for Konek.</p>
              <p className="text-xs">Passwords live on the Konek account, so there is no separate admin password to manage here.</p>
            </div>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-6">
          <Card
            title="Reset a customer's PIN"
            description="Clears their transaction PIN. They set a new one the next time they buy something. Use this if a customer reports a lost or compromised PIN."
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
