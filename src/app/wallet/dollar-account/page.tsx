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

const currencies = [
  {
    code: "USD" as Currency,
    flag: "🇺🇸",
    name: "US Dollar",
    description: "Receive US salary, freelance and business payments",
  },
  {
    code: "GBP" as Currency,
    flag: "🇬🇧",
    name: "British Pound",
    description: "Receive payments from UK clients and companies",
  },
  {
    code: "EUR" as Currency,
    flag: "🇪🇺",
    name: "Euro",
    description: "Receive payments from European customers",
  },
];

function CopyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
        <span className="block text-xs text-indigo/50">
          {label}
        </span>
        <span className="font-mono text-sm text-indigo">
          {value}
        </span>
      </span>

      <span className="text-xs text-konek-green font-semibold">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export default function GlobalAccountsPage() {
  const [data, setData] = useState<GlobalAccountData | null>(null);
  const [selected, setSelected] = useState<Currency>("USD");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/dollar-account/me")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  async function createAccount() {
    setCreating(true);
    setError("");

    const res = await fetch("/api/dollar-account/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currency: selected,
      }),
    });

    const body = await res.json().catch(() => ({}));

    setCreating(false);

    if (!res.ok) {
      setError(body.error ?? "Unable to create account");
      return;
    }

    load();
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background" />
    );
  }

  const account = data.accounts.find(
    (a) => a.currency === selected
  );

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Global Accounts"
        backHref="/home"
      />

      <div className="max-w-lg mx-auto px-5 py-6">

        <p className="text-sm text-indigo/60 mb-6">
          Receive international payments in USD, GBP and EUR.
          Built for businesses, freelancers, remote workers and
          salary earners. Use your balance for eSIM, Netflix,
          subscriptions, online services or withdraw to your bank.
        </p>


        <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">

          <p className="font-heading font-bold text-indigo mb-4">
            Choose your currency account
          </p>


          <div className="flex gap-2">
            {currencies.map((item) => (
              <button
                key={item.code}
                onClick={() =>
                  setSelected(item.code)
                }
                className={`flex-1 rounded-xl py-3 text-sm font-semibold ${
                  selected === item.code
                    ? "bg-indigo text-white"
                    : "bg-indigo/10 text-indigo"
                }`}
              >
                {item.flag}
                <br />
                {item.code}
              </button>
            ))}
          </div>

        </div>


        {!account && data.kycTier < 2 && (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-5">
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
          <div className="rounded-2xl bg-white border border-indigo/10 p-5">

            <p className="font-heading font-bold text-indigo mb-2">
              Create {selected} account
            </p>

            <p className="text-sm text-indigo/60 mb-5">
              Get your {selected} account details to receive
              payments from clients, employers and businesses
              worldwide.
            </p>

            <button
              onClick={createAccount}
              disabled={creating}
              className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"
            >
              {creating
                ? "Creating..."
                : `Create ${selected} account`}
            </button>

            {error && (
              <p className="text-sm text-red-600 mt-3">
                {error}
              </p>
            )}

          </div>
        )}


        {account && (
          <>

            <div className="rounded-2xl bg-indigo text-white p-5 mb-5">

              <p className="text-xs text-white/60">
                {selected} Balance
              </p>

              <p className="text-3xl font-bold">
                {selected === "USD" && "$"}
                {selected === "GBP" && "£"}
                {selected === "EUR" && "€"}

                {(account.balanceMinor / 100)
                  .toLocaleString(undefined,{
                    minimumFractionDigits:2
                  })}
              </p>

            </div>


            <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-5">

              <p className="font-bold text-indigo mb-3">
                Receive payments
              </p>

              <CopyRow
                label="Account number"
                value={account.account_number}
              />

              {account.routing_number && (
                <CopyRow
                  label="Routing / Bank code"
                  value={account.routing_number}
                />
              )}

              <CopyRow
                label="Bank"
                value={account.bank_name}
              />

            </div>


            <div className="rounded-2xl bg-konek-green/10 border border-konek-green/30 p-5">

              <p className="font-bold text-indigo mb-2">
                What you can do
              </p>

              <p className="text-sm text-indigo/70">
                ✓ Receive salary payments
                <br />
                ✓ Receive freelance payments
                <br />
                ✓ Receive business payments
                <br />
                ✓ Pay Netflix, eSIM and subscriptions
                <br />
                ✓ Withdraw to your bank account
              </p>

            </div>

          </>
        )}

      </div>
    </main>
  );
}
