"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function IdentityChecksPage() {

  const [checking, setChecking] = useState(false);
  const [complete, setComplete] = useState(false);


  async function runCheck() {

    setChecking(true);


    // Temporary simulation.
    // Later connects to verification service.

    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );


    setChecking(false);
    setComplete(true);

  }



  return (

    <main className="min-h-screen bg-background">


      <PageHeader
        title="Identity Checks"
        backHref="/kyc/bvn"
      />



      <div className="max-w-lg mx-auto px-5 py-6">



        <div className="mb-6">

          <p className="text-sm text-indigo/60 mb-3">
            Step 2 of 4
          </p>


          <div className="h-2 rounded-full bg-indigo/10">

            <div className="h-2 w-2/4 rounded-full bg-indigo" />

          </div>

        </div>





        <div className="rounded-2xl bg-white border border-indigo/10 p-6">



          {!complete ? (

            <>


              <div className="text-4xl mb-4">
                🛡️
              </div>



              <h1 className="text-xl font-bold text-indigo mb-2">
                Confirm your identity
              </h1>



              <p className="text-sm text-indigo/60 mb-6">

                We compare your information to ensure
                your account details are accurate.

              </p>





              <div className="space-y-3 mb-6">


                <div className="rounded-xl bg-indigo/5 p-4 flex justify-between">

                  <span className="text-indigo">
                    BVN Verification
                  </span>

                  <span className="text-konek-green font-bold">
                    ✓ Verified
                  </span>

                </div>




                <div className="rounded-xl bg-indigo/5 p-4 flex justify-between">

                  <span className="text-indigo">
                    Personal Information
                  </span>

                  <span className="text-konek-green font-bold">
                    ✓ Complete
                  </span>

                </div>




                <div className="rounded-xl bg-indigo/5 p-4 flex justify-between">

                  <span className="text-indigo">
                    Identity Match Check
                  </span>

                  <span className="text-indigo/50">
                    Pending
                  </span>

                </div>


              </div>





              <button

                onClick={runCheck}

                disabled={checking}

                className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"

              >

                {checking
                  ? "Checking..."
                  : "Run Identity Check"}

              </button>


            </>


          ) : (


            <>


              <div className="text-5xl mb-4">
                ✅
              </div>



              <h1 className="text-xl font-bold text-indigo mb-2">
                Identity Confirmed
              </h1>



              <p className="text-sm text-indigo/60 mb-6">

                Your identity checks have been completed.
                You can now upload your government documents.

              </p>




              <Link

                href="/kyc/government-upload"

                className="block w-full rounded-xl bg-konek-green text-white text-center py-3 font-semibold"

              >

                Continue

              </Link>



            </>


          )}



        </div>



      </div>



    </main>

  );
}
