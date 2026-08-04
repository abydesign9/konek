"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

interface Card {
  id: string;
  brand: string;
  last4: string;
  status: string;
  currency: string;
  single_txn_limit_minor: number | null;
  monthly_limit_minor: number | null;
  merchant_lock: string | null;
}

interface CardsResponse {
  cards: Card[];
}


export default function CardSettingsPage() {

  const params = useParams();
  const id = params.id as string;

  const [card, setCard] = useState<Card | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [singleLimit, setSingleLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [merchantLock, setMerchantLock] = useState("");
  const [message, setMessage] = useState("");

  async function loadCard() {

    const res = await fetch("/api/cards/me");
    const data: CardsResponse = await res.json();

    const found = data.cards.find(
      (item) => item.id === id
    );

    if (!found) {
      setNotFound(true);
      return;
    }

    if (found) {
      setCard(found);
      setSingleLimit(
        found.single_txn_limit_minor
          ? String(found.single_txn_limit_minor)
          : ""
      );
      setMonthlyLimit(
        found.monthly_limit_minor
          ? String(found.monthly_limit_minor)
          : ""
      );
      setMerchantLock(found.merchant_lock ?? "");
    }
  }


  useEffect(() => {
    loadCard();
  }, []);



  async function toggleFreeze() {

    if (!card) return;

    await fetch(`/api/cards/${id}/freeze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frozen: card.status === "active"
      })
    });

    loadCard();
  }



  async function saveControls() {

    await fetch(`/api/cards/${id}/controls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        singleTxnLimitMinor:
          singleLimit ? Number(singleLimit) : null,

        monthlyLimitMinor:
          monthlyLimit ? Number(monthlyLimit) : null,

        merchantLock:
          merchantLock || null
      })
    });

    setMessage("Settings saved");
  }



  if (notFound) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="Card Settings" backHref="/cards" />
        <div className="max-w-lg mx-auto px-5 py-10 text-center">
          <p className="font-semibold text-indigo mb-1">Card not found</p>
          <p className="text-sm text-indigo/60">
            This card doesn&apos;t exist or belongs to another account.
          </p>
          <a href="/cards" className="mt-6 inline-block rounded-xl bg-indigo px-6 py-3 text-sm font-semibold text-white">
            Back to cards
          </a>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-indigo/50">
          Loading card...
        </p>
      </main>
    );
  }



  return (

    <main className="min-h-screen bg-background pb-28">

      <PageHeader
        title="Card Settings"
        backHref="/cards"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        <div className="rounded-3xl bg-indigo text-white p-6 mb-6">

          <p className="text-xs text-white/60">
            Virtual Card
          </p>

          <h1 className="text-2xl font-bold mt-3">
            {card.brand}
          </h1>

          <p className="tracking-widest mt-6">
            •••• •••• •••• {card.last4}
          </p>

          <p className="mt-4 text-sm">
            Status: {card.status}
          </p>

        </div>



        <button
          onClick={toggleFreeze}
          className="w-full rounded-2xl bg-indigo text-white py-3 font-semibold mb-6"
        >
          {card.status === "active"
            ? "Freeze Card"
            : "Unfreeze Card"}
        </button>




        <div className="rounded-3xl bg-white border p-5">

          <h2 className="font-bold text-indigo mb-4">
            Spending Controls
          </h2>


          <input
            value={singleLimit}
            onChange={(e)=>setSingleLimit(e.target.value)}
            placeholder="Single transaction limit"
            className="w-full border rounded-xl px-4 py-3 mb-3"
          />


          <input
            value={monthlyLimit}
            onChange={(e)=>setMonthlyLimit(e.target.value)}
            placeholder="Monthly spending limit"
            className="w-full border rounded-xl px-4 py-3 mb-3"
          />


          <input
            value={merchantLock}
            onChange={(e)=>setMerchantLock(e.target.value)}
            placeholder="Merchant lock (optional)"
            className="w-full border rounded-xl px-4 py-3 mb-4"
          />



          <button
            onClick={saveControls}
            className="w-full rounded-xl bg-konek-green py-3 font-semibold"
          >
            Save Controls
          </button>


          {message && (
            <p className="mt-3 text-sm text-konek-green">
              {message}
            </p>
          )}

        </div>


      </div>

    </main>

  );

}
