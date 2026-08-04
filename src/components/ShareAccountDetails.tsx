"use client";

import { useState } from "react";

type Currency = "USD" | "GBP" | "EUR";

interface ShareAccountDetailsProps {
  currency: Currency;
  bankName: string;
  accountNumber: string;
  routingNumber?: string | null;
}

export default function ShareAccountDetails({
  currency,
  bankName,
  accountNumber,
  routingNumber,
}: ShareAccountDetailsProps) {

  const [copied, setCopied] = useState(false);


  const details = `
Konek Global Account

Currency: ${currency}

Bank: ${bankName}

Account Number: ${accountNumber}

${routingNumber ? `Routing Number: ${routingNumber}` : ""}

Use these details to send ${currency} payments.
  `.trim();


  async function copyDetails() {
    await navigator.clipboard.writeText(details);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }


  async function shareDetails() {

    if (navigator.share) {

      await navigator.share({
        title: `Konek ${currency} Account Details`,
        text: details,
      });

    } else {

      copyDetails();

    }

  }


  return (

    <div className="rounded-2xl bg-white border border-indigo/10 p-5">

      <p className="font-bold text-indigo mb-4">
        Share Account Details
      </p>


      <div className="rounded-xl bg-indigo/5 p-4 mb-4">

        <p className="text-xs text-indigo/50">
          Currency
        </p>

        <p className="font-semibold text-indigo mb-3">
          {currency}
        </p>


        <p className="text-xs text-indigo/50">
          Bank
        </p>

        <p className="font-semibold text-indigo mb-3">
          {bankName}
        </p>


        <p className="text-xs text-indigo/50">
          Account Number
        </p>

        <p className="font-mono text-indigo mb-3">
          {accountNumber}
        </p>


        {routingNumber && (

          <>

            <p className="text-xs text-indigo/50">
              Routing Number
            </p>

            <p className="font-mono text-indigo">
              {routingNumber}
            </p>

          </>

        )}

      </div>



      <div className="flex gap-3">


        <button
          type="button"
          onClick={copyDetails}
          className="flex-1 rounded-xl border border-indigo text-indigo py-3 font-semibold text-sm"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>



        <button
          type="button"
          onClick={shareDetails}
          className="flex-1 rounded-xl bg-indigo text-white py-3 font-semibold text-sm"
        >
          Share
        </button>


      </div>


    </div>

  );
}
