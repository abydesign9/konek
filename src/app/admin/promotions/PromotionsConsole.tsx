"use client";

import { useEffect, useState } from "react";
import { Card, Grid, PageHeader, Badge } from "@/components/adminUi";

interface Promo {
  id: string;
  name: string;
  promo_type: string;
  reward_type: string;
  target_audience: string;
  reward_amount_minor: string;
  reward_currency: string;
  cashback_pct: string | null;
  min_deposit_minor: string;
  min_spend_minor: string;
  budget_cap_minor: string | null;
  total_paid_out_minor: string;
  status: string;
  claims: string;
  unlocked: string;
}

const PROMO_TYPES = ["signup", "first_deposit", "va_activation", "card_creation", "card_cashback", "referral", "milestone", "seasonal", "custom"];
const REWARD_TYPES = ["wallet_locked", "wallet_instant", "cashback_percent", "card_fee_waiver", "free_card", "fee_discount", "va_upgrade"];
const SPEND_TYPES = ["airtime", "data", "cable", "electricity", "esim", "card_spend", "va_inflow"];

function money(minor: string | number, ccy: string) {
  const sym = ccy === "USD" ? "$" : "₦";
  return `${sym}${(Number(minor) / 100).toLocaleString()}`;
}

const BLANK = {
  name: "",
  promoType: "signup",
  rewardType: "wallet_locked",
  targetAudience: "ALL",
  rewardAmount: "",
  rewardCurrency: "NGN",
  cashbackPct: "",
  minDeposit: "",
  minSpend: "",
  validSpendTypes: [] as string[],
  budgetCap: "",
  userCap: "1",
  rewardExpiryDays: "",
  notificationMessage: "",
};

export function PromotionsConsole() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetch("/api/admin/promotions").then((r) => r.json()).then((d) => setPromos(d.promotions ?? []));
  }
  useEffect(load, []);

  async function create() {
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        promoType: form.promoType,
        rewardType: form.rewardType,
        targetAudience: form.targetAudience,
        rewardAmountMinor: form.rewardAmount ? Math.round(Number(form.rewardAmount) * 100) : 0,
        rewardCurrency: form.rewardCurrency,
        cashbackPct: form.cashbackPct || null,
        minDepositMinor: form.minDeposit ? Math.round(Number(form.minDeposit) * 100) : 0,
        minSpendMinor: form.minSpend ? Math.round(Number(form.minSpend) * 100) : 0,
        validSpendTypes: form.validSpendTypes,
        budgetCapMinor: form.budgetCap ? Math.round(Number(form.budgetCap) * 100) : null,
        userCap: form.userCap || 1,
        rewardExpiryDays: form.rewardExpiryDays || null,
        notificationMessage: form.notificationMessage || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Promo created." : d.error ?? "Failed");
    if (res.ok) {
      setForm({ ...BLANK });
      setShowForm(false);
      load();
    }
  }

  async function toggle(p: Promo) {
    await fetch(`/api/admin/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: p.status === "active" ? "paused" : "active" }),
    });
    load();
  }

  async function remove(p: Promo) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const res = await fetch(`/api/admin/promotions/${p.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setMsg(d.message ?? "Deleted.");
    load();
  }

  function toggleSpendType(t: string) {
    setForm((f) => ({
      ...f,
      validSpendTypes: f.validSpendTypes.includes(t) ? f.validSpendTypes.filter((x) => x !== t) : [...f.validSpendTypes, t],
    }));
  }

  const showsCashback = form.rewardType === "cashback_percent" || form.promoType === "card_cashback";
  const showsUnlock = form.rewardType === "wallet_locked";

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Signup, deposit, virtual account, card, cashback and milestone promos. Cash rewards land in the customer's locked bonus wallet and move to their main wallet once the unlock conditions (minimum deposit and qualifying spend) are met."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-raviion-green">{msg}</p>}

      <div className="mb-4">
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white">
          {showForm ? "Close" : "+ New promo"}
        </button>
      </div>

      {showForm && (
        <Card title="New promotion" className="mb-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="in" />
            </Field>
            <Field label="Audience">
              <select value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="in">
                <option value="ALL">All</option>
                <option value="NG">Nigeria</option>
                <option value="INTL">International</option>
              </select>
            </Field>
            <Field label="Trigger (promo type)">
              <select value={form.promoType} onChange={(e) => setForm({ ...form, promoType: e.target.value })} className="in">
                {PROMO_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Reward type">
              <select value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })} className="in">
                {REWARD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            {!showsCashback && (
              <Field label="Reward amount">
                <input value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: e.target.value.replace(/[^\d.]/g, "") })} className="in" />
              </Field>
            )}
            <Field label="Currency">
              <select value={form.rewardCurrency} onChange={(e) => setForm({ ...form, rewardCurrency: e.target.value })} className="in">
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
              </select>
            </Field>
            {showsCashback && (
              <Field label="Cashback %">
                <input value={form.cashbackPct} onChange={(e) => setForm({ ...form, cashbackPct: e.target.value.replace(/[^\d.]/g, "") })} className="in" />
              </Field>
            )}
            {showsUnlock && (
              <>
                <Field label="Min deposit to unlock">
                  <input value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: e.target.value.replace(/[^\d.]/g, "") })} className="in" />
                </Field>
                <Field label="Min spend to unlock">
                  <input value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value.replace(/[^\d.]/g, "") })} className="in" />
                </Field>
              </>
            )}
            <Field label="Budget cap (optional)">
              <input value={form.budgetCap} onChange={(e) => setForm({ ...form, budgetCap: e.target.value.replace(/[^\d.]/g, "") })} className="in" />
            </Field>
            <Field label="Max claims per user">
              <input value={form.userCap} onChange={(e) => setForm({ ...form, userCap: e.target.value.replace(/\D/g, "") })} className="in" />
            </Field>
            <Field label="Locked reward expiry (days, optional)">
              <input value={form.rewardExpiryDays} onChange={(e) => setForm({ ...form, rewardExpiryDays: e.target.value.replace(/\D/g, "") })} className="in" />
            </Field>
          </div>

          {showsUnlock && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-text-secondary">Qualifying spend types (blank = any spend counts)</p>
              <div className="flex flex-wrap gap-2">
                {SPEND_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleSpendType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${form.validSpendTypes.includes(t) ? "bg-indigo text-white" : "bg-hover-tint text-indigo/60"}`}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <Field label="Notification message (optional)">
              <input value={form.notificationMessage} onChange={(e) => setForm({ ...form, notificationMessage: e.target.value })} className="in" />
            </Field>
          </div>

          <button onClick={create} className="mt-4 rounded-lg bg-raviion-green px-5 py-2 text-sm font-semibold text-white">
            Create promo
          </button>
          <style jsx>{`.in{margin-top:4px;width:100%;border-radius:8px;border:1px solid var(--border-soft,#E4DED5);padding:8px 10px;font-size:13px}`}</style>
        </Card>
      )}

      <Grid>
        <div className="col-span-1 lg:col-span-12">
          <Card title="Live promotions">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border-soft text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="py-2 pr-3">Promo</th>
                    <th className="py-2 pr-3">Trigger</th>
                    <th className="py-2 pr-3">Reward</th>
                    <th className="py-2 pr-3 text-right">Claims</th>
                    <th className="py-2 pr-3 text-right">Unlock rate</th>
                    <th className="py-2 pr-3 text-right">Paid out</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => {
                    const claims = Number(p.claims);
                    const unlockRate = claims > 0 ? Math.round((Number(p.unlocked) / claims) * 100) : 0;
                    const reward =
                      p.reward_type === "cashback_percent" || p.promo_type === "card_cashback"
                        ? `${p.cashback_pct ?? 0}% cashback`
                        : p.reward_type.startsWith("wallet")
                        ? money(p.reward_amount_minor, p.reward_currency)
                        : p.reward_type.replace(/_/g, " ");
                    return (
                      <tr key={p.id} className="border-b border-border-soft">
                        <td className="py-2 pr-3 font-medium text-indigo">{p.name}</td>
                        <td className="py-2 pr-3 text-xs">{p.promo_type.replace(/_/g, " ")} · {p.target_audience}</td>
                        <td className="py-2 pr-3 text-xs">{reward}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{claims}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{unlockRate}%</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{money(p.total_paid_out_minor, p.reward_currency)}</td>
                        <td className="py-2 pr-3"><Badge tone={p.status === "active" ? "green" : "neutral"}>{p.status}</Badge></td>
                        <td className="py-2">
                          <div className="flex gap-3">
                            <button onClick={() => toggle(p)} className="text-xs font-semibold text-indigo">
                              {p.status === "active" ? "Pause" : "Resume"}
                            </button>
                            <button onClick={() => remove(p)} className="text-xs font-semibold text-red-600">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {promos.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-sm text-text-secondary">No promotions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Grid>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-text-secondary">
      {label}
      {children}
    </label>
  );
}
