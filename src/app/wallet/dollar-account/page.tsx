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
    description: "Receive UK client and company payments",
  },
  {
    code: "EUR" as Currency,
    flag: "🇪🇺",
    name: "Euro",
    description: "Receive European payments",
  },
];

export default function DollarAccountPage() {
  const [data, setData] = useState<GlobalAccountData | null>(null);

  function load() {
    fetch("/api/dollar-account/me")
      .then((res) => res.json())
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-background" />
    );
  }

  const totalUsd = data.accounts.reduce(
    (sum, account) =>
      sum + account.balanceMinor,
    0
  );

  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title="Global Accounts"
        backHref="/home"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        <p className="text-sm text-indigo/60 mb-6">
          Your international money hub. Receive USD, GBP and EUR
          payments, use your balance across Konek services,
          and withdraw when needed.
        </p>


        {/* Total Balance */}

        <div className="rounded-2xl bg-indigo text-white p-6 mb-6">

          <p className="text-xs text-white/60">
            Total Global Balance
          </p>

          <p className="text-3xl font-bold mt-2">
            ${(
              totalUsd / 100
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>

          <p className="text-xs text-white/60 mt-2">
            Across your currency accounts
          </p>

        </div>



        {/* Currency Accounts */}

        <p className="font-heading font-bold text-indigo mb-3">
          Your Accounts
        </p>


        <div className="flex flex-col gap-4 mb-8">

          {currencies.map((currency) => {

            const account =
              data.accounts.find(
                (item) =>
                  item.currency === currency.code
              );


            return (

              <div
                key={currency.code}
                className="rounded-2xl bg-white border border-indigo/10 p-5"
              >

                <div className="flex justify-between items-start">

                  <div>

                    <p className="font-bold text-indigo">
                      {currency.flag} {currency.code} Account
                    </p>

                    <p className="text-xs text-indigo/50 mt-1">
                      {currency.description}
                    </p>

                  </div>


                  <span
                    className={`text-xs font-semibold ${
                      account
                        ? "text-konek-green"
                        : "text-gold"
                    }`}
                  >
                    {account
                      ? "● Active"
                      : "● Locked"}
                  </span>

                </div>


                {account ? (

                  <>

                    <p className="text-2xl font-bold text-indigo mt-4">

                      {currency.code === "USD" && "$"}
                      {currency.code === "GBP" && "£"}
                      {currency.code === "EUR" && "€"}

                      {(account.balanceMinor / 100)
                        .toLocaleString(undefined,{
                          minimumFractionDigits:2
                        })}

                    </p>


                    <Link
                      href={`/wallet/global-account/${currency.code}`}
                      className="block mt-4 rounded-xl bg-indigo text-white text-center py-3 font-semibold text-sm"
                    >
                      Open Account
                    </Link>

                  </>

                ) : (

                  <>

                    <p className="text-sm text-indigo/60 mt-4">
                      Complete verification to unlock this
                      currency account.
                    </p>


                    <Link
                      href={`/wallet/global-account/${currency.code}`}
                      className="block mt-4 rounded-xl border border-indigo text-indigo text-center py-3 font-semibold text-sm"
                    >
                      Unlock {currency.code}
                    </Link>

                  </>

                )}

              </div>

            );

          })}

        </div>



        {/* Products */}

        <p className="font-heading font-bold text-indigo mb-3">
          Use your money
        </p>


        <div className="grid grid-cols-2 gap-3">


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
              Pay services easily
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


      </div>

    </main>
  );
}
