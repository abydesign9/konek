"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";


export default function KycReviewPage() {

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);



  async function submitKyc() {

    setSubmitting(true);


    // Later connects to:
    // POST /api/kyc/submit

    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );


    setSubmitting(false);
    setSubmitted(true);

  }



  if (submitted) {

    return (

      <main className="min-h-screen bg-background">

        <PageHeader
          title="Verification Submitted"
          backHref="/kyc"
        />


        <div className="max-w-lg mx-auto px-5 py-6">


          <div className="rounded-2xl bg-white border border-gold/30 p-6">


            <div className="text-5xl mb-4">
              🟡
            </div>


            <h1 className="text-xl font-bold text-indigo mb-3">
              Under Review
            </h1>


            <p className="text-sm text-indigo/60 mb-6">

              Your verification has been submitted.
              Our compliance team will review your
              information.

            </p>


            <Link

              href="/kyc/status"

              className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"

            >
              View Status

            </Link>


          </div>


        </div>


      </main>

    );

  }




  return (

    <main className="min-h-screen bg-background">


      <PageHeader

        title="KYC Review"

        backHref="/kyc/government-upload"

      />



      <div className="max-w-lg mx-auto px-5 py-6">



        <div className="mb-6">

          <p className="text-sm text-indigo/60 mb-3">
            Step 4 of 4
          </p>


          <div className="h-2 rounded-full bg-indigo/10">

            <div className="h-2 w-full rounded-full bg-indigo" />

          </div>

        </div>





        <div className="rounded-2xl bg-white border border-indigo/10 p-6">



          <div className="text-4xl mb-4">
            📋
          </div>



          <h1 className="text-xl font-bold text-indigo mb-2">

            Review Your Verification

          </h1>



          <p className="text-sm text-indigo/60 mb-6">

            Confirm that all required verification
            steps are complete before submitting.

          </p>





          <div className="space-y-3 mb-6">



            <ReviewItem
              title="Personal Information"
              description="Profile details completed"
            />



            <ReviewItem
              title="BVN Verification"
              description="Bank identity verified"
            />



            <ReviewItem
              title="Identity Checks"
              description="Information matching completed"
            />



            <ReviewItem
              title="Government Documents"
              description="Identity document uploaded"
            />



          </div>





          <button

            onClick={submitKyc}

            disabled={submitting}

            className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"

          >

            {submitting
              ? "Submitting..."
              : "Submit Verification"}

          </button>



        </div>


      </div>


    </main>

  );

}




function ReviewItem({

  title,

  description,

}: {

  title:string;

  description:string;

}) {


  return (

    <div className="flex items-center gap-3 rounded-xl bg-indigo/5 p-4">


      <div className="h-8 w-8 rounded-full bg-konek-green/20 flex items-center justify-center text-konek-green font-bold">

        ✓

      </div>


      <div>

        <p className="font-semibold text-indigo">

          {title}

        </p>


        <p className="text-xs text-indigo/60">

          {description}

        </p>


      </div>


    </div>

  );

}
