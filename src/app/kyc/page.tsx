"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface KycData {
  tier: number;
  status: string;
}

export default function KycPage() {
  const [kyc, setKyc] = useState<KycData | null>(null);

  useEffect(() => {
    fetch("/api/kyc/status")
      .then((res) => res.json())
      .then((data) => {
        setKyc({
          tier: data.tier ?? data.kycTier ?? 1,
          status: data.status ?? "incomplete",
        });
      })
      .catch(() => {
        setKyc({
          tier: 1,
          status: "incomplete",
        });
      });
  }, []);


  if (!kyc) {
    return (
      <main className="min-h-screen bg-background" />
    );
  }


  const progress =
    kyc.tier >= 2
      ? 100
      : 70;


  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title="KYC Verification"
        backHref="/home"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        <p className="text-sm text-indigo/60 mb-6">
          Build trust. Unlock more features across Konek.
        </p>



        {/* Verification Level */}

        <div className="rounded-2xl bg-indigo text-white p-6 mb-6">

          <p className="text-xs text-white/60">
            Your verification level
          </p>


          <p className="text-3xl font-bold mt-2">
            Tier {kyc.tier}
          </p>


          <p className="text-sm text-white/70 mt-1">
            {kyc.tier >= 2
              ? "Identity Verified"
              : "Basic Account"}
          </p>


          <div className="mt-5 h-2 rounded-full bg-white/20">

            <div
              className="h-2 rounded-full bg-konek-green"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>


          <p className="text-xs text-white/70 mt-2">
            {progress}% Complete
          </p>

        </div>



        {/* Progress */}

        <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">

          <p className="font-bold text-indigo mb-4">
            Your Progress
          </p>


          <div className="space-y-3 text-sm">


            <p className="flex justify-between">
              <span>Account created</span>
              <span className="text-konek-green">
                ✓
              </span>
            </p>


            <p className="flex justify-between">
              <span>Phone verified</span>
              <span className="text-konek-green">
                ✓
              </span>
            </p>


            <p className="flex justify-between">
              <span>Email verified</span>
              <span className="text-konek-green">
                ✓
              </span>
            </p>


            <p className="flex justify-between">
              <span>Personal Information</span>
              <span>
                {kyc.tier >= 2 ? "✓" : "○"}
              </span>
            </p>


            <p className="flex justify-between">
              <span>Government ID</span>
              <span>
                {kyc.tier >= 2 ? "✓" : "○"}
              </span>
            </p>


            <p className="flex justify-between">
              <span>Selfie / Liveness</span>
              <span>
                {kyc.tier >= 2 ? "✓" : "○"}
              </span>
            </p>


          </div>

        </div>




        {/* Unlock Features */}

        <div className="rounded-2xl bg-konek-green/10 border border-konek-green/30 p-5 mb-6">


          <p className="font-bold text-indigo mb-3">
            Complete Tier 2 to unlock
          </p>


          <div className="space-y-2 text-sm text-indigo/80">

            <p>
              🇺🇸 USD Global Account
            </p>

            <p>
              🇬🇧 GBP Global Account
            </p>

            <p>
              🇪🇺 EUR Global Account
            </p>

            <p>
              💳 Virtual Card
            </p>

            <p>
              💰 Higher transaction limits
            </p>


          </div>

        </div>




        {kyc.tier < 2 ? (

          <Link
            href="/kyc/personal-information"
            className="block w-full rounded-xl bg-indigo text-white text-center py-3 font-semibold"
          >
            Continue Verification
          </Link>

        ) : (

          <Link
            href="/wallet/dollar-account"
            className="block w-full rounded-xl bg-konek-green text-white text-center py-3 font-semibold"
          >
            Explore Global Accounts
          </Link>

        )}



      </div>

    </main>
  );
}
