"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface CardTxn {
  id: string;
  merchant_name: string;
  amount_minor: string;
  status: string;
  decline_reason: string | null;
  three_ds_passed: boolean | null;
}

interface Card {
  id: string;
  brand: string;
  last4: string;
  status: string;
  currency: string;
  single_txn_limit_minor: string | null;
  monthly_limit_minor: string | null;
  merchant_lock: string | null;
  transactions: CardTxn[];
}

interface RevealedDetails {
  pan: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

function CardControlsForm({ card, onSave }: { card: Card; onSave: (c: Record<string, unknown>) => void }) {
  const [single, setSingle] = useState(card.single_txn_limit_minor ? String(Number(card.single_txn_limit_minor) / 100) : "");
  const [monthly, setMonthly] = useState(card.monthly_limit_minor ? String(Number(card.monthly_limit_minor) / 100) : "");
  const [lock, setLock] = useState(card.merchant_lock ?? "");

  return (
    <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-4">
      <p className="text-xs font-semibold text-indigo/60 mb-3">Card controls</p>
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 text-sm text-indigo">
          Per-transaction limit ($)
          <input value={single} onChange={(e) => setSingle(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="none" className="w-24 rounded-lg border border-indigo/20 px-3 py-1.5 text-sm text-right" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-indigo">
          Monthly limit ($)
          <input value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="none" className="w-24 rounded-lg border border-indigo/20 px-3 py-1.5 text-sm text-right" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-indigo">
          Lock to merchant
          <input value={lock} onChange={(e) => setLock(e.target.value)}
            placeholder="any" className="w-32 rounded-lg border border-indigo/20 px-3 py-1.5 text-sm" />
        </label>
        <button
          onClick={() =>
            onSave({
              singleTxnLimitMinor: single ? Math.round(Number(single) * 100) : null,
              monthlyLimitMinor: monthly ? Math.round(Number(monthly) * 100) : null,
              merchantLock: lock.trim() || null,
            })
          }
          className="self-start rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2"
        >
          Save controls
        </button>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [balanceMinor, setBalanceMinor] = useState(0);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [merchantName, setMerchantName] = useState("Amazon");
  const [amount, setAmount] = useState("25");
  const [challenge, setChallenge] = useState<{
    cardTransactionId: string;
    threeDsChallengeId: string;
    devOtpHint: string;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, RevealedDetails>>({});

  function load() {
    fetch("/api/cards/me")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards ?? []);
        setBalanceMinor(data.balanceMinor ?? 0);
      });
  }

  useEffect(load, []);

  async function issue() {
    setIssuing(true);
    setError(null);
    const res = await fetch("/api/cards/issue", { method: "POST" });
    setIssuing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    load();
  }

  async function startPurchase(cardId: string) {
    setResult(null);
    setError(null);
    const amountMinor = Math.round(Number(amount) * 100);
    const res = await fetch(`/api/cards/${cardId}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMinor, merchantName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (data.declined) {
      setResult(`Declined: ${data.message}`);
      load();
      return;
    }
    setChallenge(data);
  }

  async function reveal(cardId: string) {
    if (revealed[cardId]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[cardId];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/cards/${cardId}/reveal`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setRevealed((r) => ({ ...r, [cardId]: data }));
  }

  async function saveControls(cardId: string, controls: Record<string, unknown>) {
    await fetch(`/api/cards/${cardId}/controls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controls),
    });
    setResult("Card controls updated");
    load();
  }

  async function confirmThreeDs() {
    if (!challenge) return;
    setSettling(true);
    const res = await fetch(`/api/cards/transactions/${challenge.cardTransactionId}/complete-3ds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threeDsChallengeId: challenge.threeDsChallengeId, code: otp }),
    });
    const data = await res.json();
    setSettling(false);
    setChallenge(null);
    setOtp("");
    setResult(data.status === "settled" ? "Purchase approved" : `Declined: ${data.declineReason}`);
    load();
  }

  async function toggleFreeze(cardId: string, frozen: boolean) {
    await fetch(`/api/cards/${cardId}/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen }),
    });
    load();
  }

  async function dispute(txnId: string) {
    const res = await fetch(`/api/cards/transactions/${txnId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "unauthorized charge" }),
    });
    const data = await res.json();
    setResult(res.ok ? `Dispute filed — $${(data.feeMinor / 100).toFixed(2)} fee charged` : data.error);
    load();
  }

  if (challenge) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-xs text-center">
          <h1 className="font-heading text-lg font-bold text-indigo mb-1">3-D Secure</h1>
          <p className="text-sm text-indigo/60 mb-1">Enter the code sent to your phone</p>
          <p className="text-xs text-indigo/40 mb-6">(dev hint: {challenge.devOtpHint})</p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 text-center tracking-widest text-lg mb-4"
          />
          <button
            onClick={confirmThreeDs}
            disabled={settling || otp.length !== 6}
            className="w-full rounded-xl bg-indigo text-white font-semibold py-3 disabled:opacity-50"
          >
            {settling ? "Verifying…" : "Confirm"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Virtual cards" backHref="/home" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-indigo/60 mb-6">USD wallet balance: ${(balanceMinor / 100).toLocaleString()}</p>

      {result && <p className="text-sm text-konek-green font-medium mb-4">{result}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {cards.length === 0 && (
        <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
          <button
            onClick={issue}
            disabled={issuing}
            className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 disabled:opacity-50"
          >
            {issuing ? "Issuing…" : "Issue a virtual card"}
          </button>
        </div>
      )}

      {cards.map((card) => (
        <div key={card.id} className="mb-8">
          <div className="rounded-2xl bg-indigo px-5 py-4 text-white mb-4">
            <p className="text-xs text-white/60 mb-1 uppercase">{card.brand}</p>
            {revealed[card.id] ? (
              <>
                <p className="font-heading text-lg font-bold tracking-[0.15em]">
                  {revealed[card.id].pan.replace(/(.{4})/g, "$1 ").trim()}
                </p>
                <p className="text-xs text-white/70 mt-2">
                  Exp {String(revealed[card.id].expMonth).padStart(2, "0")}/{revealed[card.id].expYear} · CVV{" "}
                  {revealed[card.id].cvv}
                </p>
              </>
            ) : (
              <>
                <p className="font-heading text-lg font-bold tracking-widest">•••• •••• •••• {card.last4}</p>
                <p className="text-xs text-white/70 mt-2 capitalize">{card.status}</p>
              </>
            )}
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => reveal(card.id)}
              className="text-xs font-semibold text-indigo underline"
            >
              {revealed[card.id] ? "Hide details" : "Reveal details"}
            </button>
            <button
              onClick={() => toggleFreeze(card.id, card.status === "active")}
              className="text-xs font-semibold text-indigo underline"
            >
              {card.status === "active" ? "Freeze card" : "Unfreeze card"}
            </button>
          </div>

          <CardControlsForm card={card} onSave={(c) => saveControls(card.id, c)} />

          {(card.merchant_lock || card.single_txn_limit_minor || card.monthly_limit_minor) && (
            <p className="text-xs text-indigo/50 mb-4">
              {card.merchant_lock && <>Locked to {card.merchant_lock}. </>}
              {card.single_txn_limit_minor && <>Per-txn ${(Number(card.single_txn_limit_minor) / 100).toLocaleString()}. </>}
              {card.monthly_limit_minor && <>Monthly ${(Number(card.monthly_limit_minor) / 100).toLocaleString()}.</>}
            </p>
          )}

          {card.status === "active" && (
            <div className="rounded-2xl border border-indigo/10 bg-white p-4 mb-4">
              <p className="text-xs text-indigo/60 mb-2">Simulate a purchase</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Merchant"
                  className="flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
                />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="$"
                  className="w-20 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => startPurchase(card.id)}
                className="w-full rounded-lg bg-indigo text-white text-sm font-semibold py-2"
              >
                Pay
              </button>
            </div>
          )}

          <p className="text-xs text-indigo/60 mb-2">Transactions</p>
          <div className="flex flex-col gap-2">
            {card.transactions.map((t) => (
              <div key={t.id} className="rounded-xl border border-indigo/10 bg-white px-4 py-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-indigo">{t.merchant_name}</span>
                  <span className="text-sm font-semibold text-indigo">
                    ${(Number(t.amount_minor) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${t.status === "settled" ? "text-konek-green" : "text-red-600"}`}>
                    {t.status} {t.decline_reason ? `(${t.decline_reason})` : ""}
                  </span>
                  {t.status === "settled" && (
                    <button onClick={() => dispute(t.id)} className="text-xs text-red-600 underline">
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            ))}
            {card.transactions.length === 0 && <p className="text-sm text-indigo/50">No transactions yet.</p>}
          </div>
        </div>
      ))}

      <Link href="/home" className="text-sm text-indigo/60 underline">
        Back to home
      </Link>
      </div>
    </main>
  );
}
