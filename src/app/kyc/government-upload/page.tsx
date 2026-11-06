"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

type DocumentType =
  | "National ID"
  | "International Passport"
  | "Driver&apos;s License";


export default function GovernmentUploadPage() {

  const [documentType, setDocumentType] =
    useState<DocumentType>("National ID");

  const [frontUploaded, setFrontUploaded] =
    useState(false);

  const [backUploaded, setBackUploaded] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);



  function submitDocuments() {

    if (!frontUploaded) return;

    setSubmitted(true);

  }



  if (submitted) {

    return (

      <main className="min-h-screen bg-background">

        <PageHeader
          title="Government Documents"
          backHref="/kyc/identity-checks"
        />


        <div className="max-w-lg mx-auto px-5 py-6">


          <div className="rounded-2xl bg-white border border-raviion-green/30 p-6">


            <div className="text-5xl mb-4">
              ✅
            </div>


            <h1 className="text-xl font-bold text-indigo mb-3">
              Documents Submitted
            </h1>


            <p className="text-sm text-indigo/60 mb-6">

              Your government documents have been
              submitted for verification.

              Our team will review them before
              approving your KYC.

            </p>



            <Link

              href="/kyc/review"

              className="block w-full rounded-xl bg-indigo text-white text-center py-3 font-semibold"

            >
              Continue to Review

            </Link>


          </div>


        </div>

      </main>

    );

  }



  return (

    <main className="min-h-screen bg-background">


      <PageHeader

        title="Government Uploads"

        backHref="/kyc/identity-checks"

      />



      <div className="max-w-lg mx-auto px-5 py-6">



        <div className="mb-6">

          <p className="text-sm text-indigo/60 mb-3">
            Step 3 of 4
          </p>


          <div className="h-2 rounded-full bg-indigo/10">

            <div className="h-2 w-3/4 rounded-full bg-indigo" />

          </div>

        </div>




        <div className="rounded-2xl bg-white border border-indigo/10 p-6">


          <div className="text-4xl mb-4">
            🪪
          </div>


          <h1 className="text-xl font-bold text-indigo mb-2">
            Upload your identity document
          </h1>


          <p className="text-sm text-indigo/60 mb-6">

            Upload a valid government-issued document
            to complete your identity verification.

          </p>





          <label className="block text-sm font-semibold text-indigo mb-2">

            Document Type

          </label>



          <select

            value={documentType}

            onChange={(e) =>
              setDocumentType(
                e.target.value as DocumentType
              )
            }

            className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-5"

          >

            <option>
              National ID
            </option>

            <option>
              International Passport
            </option>

            <option>
              Driver&apos;s License
            </option>

          </select>





          <div className="space-y-4 mb-6">


            <button

              onClick={() => setFrontUploaded(true)}

              className={`w-full rounded-xl border p-4 text-left ${
                frontUploaded
                  ? "border-raviion-green bg-raviion-green/10"
                  : "border-indigo/20"
              }`}

            >

              <p className="font-semibold text-indigo">
                Front Document
              </p>

              <p className="text-sm text-indigo/60">

                {frontUploaded
                  ? "✓ Uploaded"
                  : "Tap to upload"}

              </p>

            </button>




            <button

              onClick={() => setBackUploaded(true)}

              className={`w-full rounded-xl border p-4 text-left ${
                backUploaded
                  ? "border-raviion-green bg-raviion-green/10"
                  : "border-indigo/20"
              }`}

            >

              <p className="font-semibold text-indigo">
                Back Document
              </p>


              <p className="text-sm text-indigo/60">

                {backUploaded
                  ? "✓ Uploaded"
                  : "Tap to upload (if required)"}

              </p>


            </button>


          </div>





          <button

            onClick={submitDocuments}

            disabled={!frontUploaded}

            className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-40"

          >

            Submit Documents

          </button>


        </div>


      </div>


    </main>

  );
}
