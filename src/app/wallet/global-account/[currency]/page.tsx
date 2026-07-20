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
}

interface GlobalAccountData {
  kycTier: number;
  accounts: Account[];
}

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
      type="button"
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

export default function GlobalAccountPage({
  params,
}: {
  params: { currency: Currency };
}) {
  const [data, setData] = useState<GlobalAccountData | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const currency = params.currency.toUpperCase() as Currency;

  function load() {
    fetch("/api/dollar-account/me")
      .then((res) => res.json())
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  const account = data?.accounts.find(
    (item) => item.currency === currency
  );

  async function createAccount() {
    setCreating(true);
    setError("");

    const res = await fetch("/api/dollar-account/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currency,
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

  const symbol =
    currency === "USD"
      ? "$"
      : currency === "GBP"
      ? "£"
      : "€";

  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title={`${currency} Account`}
        backHref="/wallet/dollar-account"
      />

      <div className="max-w-lg mx-auto px-5 py-6">

        <p className="text-sm text-indigo/60 mb-6">
          Receive international payments in {currency}.
          Keep your money inside Konek and use it for
          payments, subscriptions, business services,
          or withdraw when needed.
        </p>


        {!account && data.kycTier >= 2 && (
          <div className="rounded-2xl bg-white border border-indigo/10 p-5">

            <p className="font-heading font-bold text-indigo mb-2">
              Create {currency} account
            </p>

            <p className="text-sm text-indigo/60 mb-5">
              Get your {currency} account details and receive
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
                : `Create ${currency} account`}
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

            {/* Balance */}
            <div className="rounded-2xl bg-indigo text-white p-6 mb-6">

              <p className="text-xs text-white/60">
                Available Balance
              </p>

              <p className="text-3xl font-bold mt-2">
                {symbol}
                {(account.balanceMinor / 100).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </p>

            </div>


            {/* Primary products */}
            <p className="font-heading font-bold text-indigo mb-3">
              Use your money
            </p>


            <div className="flex flex-col gap-3 mb-8">

              <div className="rounded-2xl bg-white border border-indigo/10 p-5">
                <p className="font-bold text-indigo">
                  💳 Virtual Dollar Card
                </p>

                <p className="text-sm text-indigo/60 mt-1">
                  Pay Netflix, Spotify, ads, software
                  subscriptions and online services.
                </p>

                <button className="mt-4 text-sm font-semibold text-konek-green">
                  Open Card →
                </button>
              </div>


              <div className="rounded-2xl bg-white border border-indigo/10 p-5">
                <p className="font-bold text-indigo">
                  📱 eSIM & Data
                </p>

                <p className="text-sm text-indigo/60 mt-1">
                  Stay connected anywhere in the world.
                </p>

                <Link
                  href="/buy/esim"
                  className="mt-4 block text-sm font-semibold text-konek-green"
                >
                  Buy eSIM →
                </Link>
              </div>


              <div className="rounded-2xl bg-white border border-indigo/10 p-5">
                <p className="font-bold text-indigo">
                  🧾 Bills & Subscriptions
                </p>

                <p className="text-sm text-indigo/60 mt-1">
                  Pay your daily services directly from
                  your global balance.
                </p>
              </div>


              <div className="rounded-2xl bg-white border border-indigo/10 p-5">
                <p className="font-bold text-indigo">
                  🏢 Business Payments
                </p>

                <p className="text-sm text-indigo/60 mt-1">
                  Pay suppliers, partners and teams.
                </p>
              </div>

            </div>


            {/* Receive money */}
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


            {/* Withdraw secondary */}
            <div className="rounded-2xl border border-indigo/10 bg-white p-5">

              <p className="font-bold text-indigo">
                Need cash?
              </p>

              <p className="text-sm text-indigo/60 mt-1 mb-4">
                Withdraw your balance to your verified
                Nigerian bank account.
              </p>

              <button className="w-full rounded-xl border border-indigo text-indigo py-3 font-semibold">
                Withdraw
              </button>

            </div>

          </>
        )}

      </div>

    </main>
  );
}
