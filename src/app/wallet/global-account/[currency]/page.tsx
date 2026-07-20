"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import ShareAccountDetails from "@/components/ShareAccountDetails";

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

export default function GlobalAccountPage({
  params,
}: {
  params: { currency: Currency };
}) {
  const currency = params.currency.toUpperCase() as Currency;

  const [data, setData] = useState<GlobalAccountData | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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
          Receive {currency} payments globally.
          Use your balance for Konek services,
          subscriptions, business payments and more.
        </p>



        {!account && data.kycTier < 2 && (

          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-5">

            <p className="text-sm text-indigo mb-3">
              Global Accounts require KYC Tier 2 verification.
            </p>


            <Link
              href="/kyc"
              className="inline-block rounded-xl bg-indigo text-white px-5 py-3 text-sm font-semibold"
            >
              Verify Now
            </Link>

          </div>

        )}




        {!account && data.kycTier >= 2 && (

          <div className="rounded-2xl bg-white border border-indigo/10 p-5">

            <p className="font-bold text-indigo mb-2">
              Create {currency} Account
            </p>


            <p className="text-sm text-indigo/60 mb-5">
              Receive salary, freelance and business payments
              in {currency}.
            </p>


            <button
              onClick={createAccount}
              disabled={creating}
              className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"
            >
              {creating
                ? "Creating..."
                : `Create ${currency} Account`}
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




            {/* Products */}

            <p className="font-bold text-indigo mb-3">
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
                  Stay connected
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
                  Pay services
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




            {/* Share Details */}

            <ShareAccountDetails

              currency={currency}

              bankName={account.bank_name}

              accountNumber={account.account_number}

              routingNumber={account.routing_number}

            />





            {/* Activity */}

            <div className="rounded-2xl bg-white border border-indigo/10 p-5 mt-6">

              <p className="font-bold text-indigo mb-3">
                Recent Activity
              </p>


              {account.inflows.length === 0 && (

                <p className="text-sm text-indigo/50">
                  No transactions yet.
                </p>

              )}



              {account.inflows.map((item, index) => (

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
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}

                  </p>


                </div>

              ))}

            </div>





            {/* Withdraw */}

            <div className="rounded-2xl bg-white border border-indigo/10 p-5 mt-6">

              <p className="font-bold text-indigo">
                Need cash?
              </p>


              <p className="text-sm text-indigo/60 mt-1 mb-4">
                Withdraw to your verified Nigerian bank account.
              </p>


              <Link
                href="/wallet/withdraw"
                className="block text-center rounded-xl border border-indigo text-indigo py-3 font-semibold"
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
