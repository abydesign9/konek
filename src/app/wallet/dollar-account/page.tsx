"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

type Currency = "USD" | "GBP" | "EUR";

interface Account {
  id: string;
  currency: Currency;
  account_number: string;
  routing_number: string | null;
  bank_name: string;
  status: string;
  balanceMinor: number;
  inflows: {
    sender_name: string;
    sender_bank: string;
    amount_minor: string;
    currency: string;
    status: string;
    received_at: string;
  }[];
}

interface GlobalAccountData {
  kycTier: number;
  accounts: Account[];
}

const currencies: { code: Currency; flag: string; name: string }[] = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="w-full flex justify-between items-center py-3 border-b border-indigo/10 last:border-0"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      <span>
        <span className="block text-xs text-indigo/50">{label}</span>
        <span className="font-mono text-sm text-indigo">{value}</span>
      </span>
      <span className="text-xs text-konek-green font-semibold">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export default function GlobalAccountPage({ params }: { params?: { currency: Currency } }) {
  const [data, setData] = useState<GlobalAccountData | null>(null);
  const [selected, setSelected] = useState<Currency>(params?.currency ?? "USD");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dollar-account/me")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const account = data?.accounts.find((a) => a.currency === selected);

  async function createAccount() {
    setCreating(true);
    setError("");

    const res = await fetch("/api/dollar-account/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: selected }),
    });

    const body = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      setError(body.error ?? "Unable to create account");
      return;
    }

    setData((prev) =>
      prev ? { ...prev, accounts: [...prev.accounts, body] } : prev
    );
  }

  if (!data) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="Global Accounts" backHref="/home" />

      <div className="max-w-lg mx-auto px-5 py-6">
        <p className="text-sm text-indigo/60 mb-6">
          Receive international payments in USD, GBP, and EUR. Built for businesses,
          freelancers, remote workers, and salary earners. Use your balance for eSIM,
          Netflix, subscriptions, online services, or withdraw to your bank.
        </p>

        <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">
          <p className="font-heading font-bold text-indigo mb-4">Choose your currency account</p>
          <div className="flex gap-2 overflow-x-auto">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelected(c.code)}
                className={`flex-none rounded-xl py-3 px-4 text-sm font-semibold whitespace-nowrap ${
                  selected === c.code
                    ? "bg-indigo text-white"
                    : "bg-indigo/10 text-indigo"
                }`}
              >
                {c.flag} <br /> {c.code}
              </button>
            ))}
          </div>
        </div>

        {!account && data.kycTier < 2 && (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-5 mb-5">
            <p className="text-sm text-indigo mb-3">
              Global accounts require KYC Tier 2 verification.
            </p>
            <Link
              href="/kyc"
              className="rounded-xl bg-indigo text-white px-5 py-3 inline-block text-sm font-semibold"
            >
              Verify now
            </Link>
          </div>
        )}

        {!account && data.kycTier >= 2 && (
          <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-5">
            <p className="font-heading font-bold text-indigo mb-2">Create {selected} account</p>
            <p className="text-sm text-indigo/60 mb-5">
              Get your {selected} account details to receive payments from clients,
              employers, and businesses worldwide.
            </p>
            <button
              onClick={createAccount}
              disabled={creating}
              className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"
            >
              {creating ? "Creating..." : `Create ${selected} account`}
            </button>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </div>
        )}        {account && (
          <>

            {/* Balance Card */}
            <div className="rounded-2xl bg-indigo text-white p-6 mb-6">

              <p className="text-xs text-white/60">
                {selected} Balance
              </p>

              <p className="text-3xl font-bold mt-2">

                {selected === "USD" && "$"}
                {selected === "GBP" && "£"}
                {selected === "EUR" && "€"}

                {(account.balanceMinor / 100).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                  }
                )}

              </p>

            </div>


            {/* Quick Products */}
            <p className="font-heading font-bold text-indigo mb-3">
              Use your money
            </p>


            <div className="grid grid-cols-2 gap-3 mb-6">

              <Link
                href="/cards"
                className="rounded-2xl bg-white border border-indigo/10 p-4"
              >
                <p className="font-bold text-indigo">
                  💳 Virtual Card
                </p>

                <p className="text-xs text-indigo/60 mt-2">
                  Pay online worldwide
                </p>

              </Link>


              <Link
                href="/buy/esim"
                className="rounded-2xl bg-white border border-indigo/10 p-4"
              >
                <p className="font-bold text-indigo">
                  📱 eSIM
                </p>

                <p className="text-xs text-indigo/60 mt-2">
                  Stay connected globally
                </p>

              </Link>


              <Link
                href="/wallet"
                className="rounded-2xl bg-white border border-indigo/10 p-4"
              >
                <p className="font-bold text-indigo">
                  🧾 Bills
                </p>

                <p className="text-xs text-indigo/60 mt-2">
                  Pay subscriptions
                </p>

              </Link>


              <Link
                href="/business"
                className="rounded-2xl bg-white border border-indigo/10 p-4"
              >
                <p className="font-bold text-indigo">
                  🏢 Business
                </p>

                <p className="text-xs text-indigo/60 mt-2">
                  Global payments
                </p>

              </Link>

            </div>



            {/* Receive Details */}
            <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">

              <p className="font-bold text-indigo mb-3">
                Receive payments
              </p>


              <CopyRow
                label="Account Number"
                value={account.account_number}
              />


              {account.routing_number && (
                <CopyRow
                  label="Routing / Bank Code"
                  value={account.routing_number}
                />
              )}


              <CopyRow
                label="Bank"
                value={account.bank_name}
              />


            </div>



            {/* Recent Activity */}
            <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">

              <p className="font-bold text-indigo mb-3">
                Recent Activity
              </p>


              {account.inflows.length === 0 ? (

                <p className="text-sm text-indigo/50">
                  No transactions yet.
                </p>

              ) : (

                account.inflows.slice(0, 5).map((item, index) => (

                  <div
                    key={index}
                    className="flex justify-between py-3 border-b border-indigo/10 last:border-0"
                  >

                    <div>

                      <p className="text-sm font-semibold text-indigo">
                        {item.sender_name}
                      </p>

                      <p className="text-xs text-indigo/50">
                        {item.sender_bank}
                      </p>

                    </div>


                    <p className="text-sm font-bold text-konek-green">
                      +
                      {(Number(item.amount_minor) / 100)
                        .toLocaleString(undefined,{
                          minimumFractionDigits:2
                        })}
                    </p>


                  </div>

                ))

              )}

            </div>



            {/* Withdraw Secondary */}
            <div className="rounded-2xl bg-white border border-indigo/10 p-5">

              <p className="font-bold text-indigo">
                Need cash?
              </p>

              <p className="text-sm text-indigo/60 mt-1 mb-4">
                Withdraw to your verified Nigerian bank account.
              </p>


              <Link
                href="/wallet/withdraw"
                className="block w-full rounded-xl border border-indigo text-indigo text-center py-3 font-semibold"
              >
                Withdraw
              </Link>


            </div>


          </>
        )}

      </div>

    </main>
  );
}
