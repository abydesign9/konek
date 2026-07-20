"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

type DocumentType = "national_id" | "passport" | "driver_license";

export default function KycDocumentPage() {
  const router = useRouter();

  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const handleContinue = () => {
    if (!docType || !frontFile) {
      alert("Please select a document type and upload at least the front side.");
      return;
    }

    // For now, just log. Later connect to API/storage.
    console.log({ docType, frontFile, backFile });

    router.push("/kyc/liveness");
  };

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <PageHeader title="Identity Verification" backHref="/kyc/personal" />

      <div className="max-w-lg mx-auto mt-6 bg-white rounded-2xl p-6 border border-indigo/10">
        <p className="text-sm text-indigo/60 mb-1">Step 2 of 3</p>
        <div className="w-full h-2 bg-indigo/10 rounded-full mb-6">
          <div className="w-2/3 h-2 bg-indigo rounded-full"></div>
        </div>

        <h2 className="font-heading text-lg font-bold text-indigo mb-4">Government ID</h2>
        <p className="text-sm text-indigo/60 mb-4">Choose your document</p>

        <div className="flex flex-col gap-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              value="national_id"
              checked={docType === "national_id"}
              onChange={() => setDocType("national_id")}
              className="accent-indigo"
            />
            National ID
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              value="passport"
              checked={docType === "passport"}
              onChange={() => setDocType("passport")}
              className="accent-indigo"
            />
            International Passport
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              value="driver_license"
              checked={docType === "driver_license"}
              onChange={() => setDocType("driver_license")}
              className="accent-indigo"
            />
            Driver License
          </label>
        </div>

        <p className="text-sm text-indigo/60 mb-2">Upload Document</p>
        <div className="flex flex-col gap-4 mb-6">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
            className="border border-indigo/20 rounded-xl px-4 py-3"
          />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
            className="border border-indigo/20 rounded-xl px-4 py-3"
          />
        </div>

        <p className="text-xs text-indigo/50 mb-6">
          Your documents are encrypted and securely processed.
        </p>

        <button
          onClick={handleContinue}
          className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"
        >
          Continue
        </button>
      </div>
    </main>
  );
}
