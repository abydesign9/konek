"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";

type Requirement =
  | "BVN_VERIFIED"
  | "KYC_APPROVED"
  | "BANK_VERIFIED"
  | "LIVENESS_VERIFIED";


interface KycGateProps {
  children: ReactNode;
  requirements: Requirement[];
  featureName: string;
}


interface VerificationStatus {

  tier: number;

  status: string;

  bvnVerified: boolean;

  ninVerified: boolean;

  bankVerified: boolean;

  livenessVerified: boolean;

}



export default function KycGate({
  children,
  requirements,
  featureName,
}: KycGateProps) {


  const [status, setStatus] =
    useState<VerificationStatus | null>(null);



  useEffect(() => {

    fetch("/api/verification/status")

      .then((res) => res.json())

      .then(setStatus)

      .catch(() => setStatus(null));


  }, []);




  if (!status) {

    return (

      <div className="min-h-screen flex items-center justify-center text-indigo">

        Checking verification...

      </div>

    );

  }





  const checks = {


    BVN_VERIFIED:
      status.bvnVerified ||
      status.ninVerified,



    KYC_APPROVED:
      status.tier >= 2 &&
      status.status === "verified",



    BANK_VERIFIED:
      status.bankVerified,



    LIVENESS_VERIFIED:
      status.livenessVerified,


  };





  const allowed =
    requirements.every(
      (item) => checks[item]
    );






  if (allowed) {

    return <>{children}</>;

  }





  return (

    <main className="min-h-screen bg-background p-6">


      <div className="max-w-md mx-auto rounded-3xl bg-white border border-indigo/10 p-6">


        <div className="text-4xl mb-4">
          🔐
        </div>



        <h1 className="font-heading text-xl font-bold text-indigo mb-3">

          Verification required

        </h1>



        <p className="text-sm text-indigo/60 mb-6">

          Complete verification before accessing {featureName}.

        </p>




        <div className="space-y-3 mb-6">


          {requirements.map((item) => (

            <div
              key={item}
              className="flex justify-between bg-indigo/5 rounded-xl p-3"
            >

              <span className="text-sm text-indigo">

                {item === "BVN_VERIFIED" &&
                  "BVN / NIN Verification"}

                {item === "KYC_APPROVED" &&
                  "KYC Approval"}

                {item === "BANK_VERIFIED" &&
                  "Bank Verification"}

                {item === "LIVENESS_VERIFIED" &&
                  "Liveness Check"}

              </span>


              <span>

                {checks[item]
                  ? "✅"
                  : "⭕"}

              </span>


            </div>

          ))}


        </div>




        <Link

          href="/kyc"

          className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"

        >

          Complete Verification

        </Link>


      </div>


    </main>

  );


}
