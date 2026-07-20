"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

type Status = "pending" | "approved" | "rejected";

interface KycStatusData {
  status: Status;
  tier: number;
}

export default function KycStatusPage() {

  const [data, setData] = useState<KycStatusData>({
    status: "pending",
    tier: 1,
  });


  useEffect(() => {

    fetch("/api/kyc/status")
      .then((res) => res.json())
      .then((result) => {

        setData({
          status:
            result.status ?? "pending",

          tier:
            result.tier ?? result.kycTier ?? 1,
        });

      })
      .catch(() => {

        setData({
          status: "pending",
          tier: 1,
        });

      });

  }, []);



  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title="Verification Status"
        backHref="/kyc"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        {data.status === "pending" && (

          <div className="rounded-2xl bg-white border border-indigo/10 p-6">

            <div className="text-5xl mb-5">
              🟡
            </div>


            <h1 className="text-xl font-bold text-indigo mb-3">
              Under Review
            </h1>


            <p className="text-sm text-indigo/60 mb-6">
              Your documents have been submitted.
              Our team is reviewing your information.
            </p>


            <div className="rounded-xl bg-indigo/5 p-4">

              <p className="text-sm text-indigo">
                Current Level:
                <strong> Tier {data.tier}</strong>
              </p>


              <p className="text-sm text-indigo mt-2">
                Requested:
                <strong> Tier 2</strong>
              </p>

            </div>


            <p className="text-xs text-indigo/50 mt-5">
              Expected review time: Within 24 hours.
            </p>

          </div>

        )}




        {data.status === "approved" && (

          <div className="rounded-2xl bg-white border border-konek-green/30 p-6">


            <div className="text-5xl mb-5">
              🎉
            </div>


            <h1 className="text-xl font-bold text-indigo mb-3">
              Congratulations
            </h1>


            <p className="text-sm text-indigo/60 mb-6">
              Your identity has been verified.
              You are now Tier 2 verified.
            </p>



            <div className="rounded-xl bg-konek-green/10 p-4 mb-6">

              <p className="font-bold text-indigo mb-3">
                Unlocked
              </p>


              <p className="text-sm text-indigo">
                ✓ USD Global Account
                <br />
                ✓ GBP Global Account
                <br />
                ✓ EUR Global Account
                <br />
                ✓ Virtual Card
                <br />
                ✓ Higher Limits
              </p>


            </div>



            <Link
              href="/wallet/dollar-account"
              className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"
            >
              Explore Global Accounts
            </Link>


          </div>

        )}






        {data.status === "rejected" && (

          <div className="rounded-2xl bg-white border border-red-200 p-6">

            <div className="text-5xl mb-5">
              ⚠️
            </div>


            <h1 className="text-xl font-bold text-indigo mb-3">
              Verification Needs Attention
            </h1>


            <p className="text-sm text-indigo/60 mb-6">
              We could not verify your details.
            </p>


            <Link
              href="/kyc/document"
              className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"
            >
              Update Documents
            </Link>


          </div>

        )}



      </div>

    </main>
  );
}
