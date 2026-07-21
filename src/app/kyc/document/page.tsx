"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

type DocumentType =
  | "national_id"
  | "passport"
  | "driver_license";

interface UploadResponse {
  ok?: boolean;
  documentId?: string;
  status?: string;
  error?: string;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function KycDocumentPage() {
  const router = useRouter();

  const [docType, setDocType] =
    useState<DocumentType | null>(null);

  const [frontFile, setFrontFile] =
    useState<File | null>(null);

  const [backFile, setBackFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function validateFile(
    file: File | null
  ): string | null {
    if (!file) return null;

    if (file.size > MAX_FILE_BYTES) {
      return `${file.name} is larger than 8 MB.`;
    }

    const supported = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (
      file.type &&
      !supported.includes(file.type)
    ) {
      return `${file.name} must be a PDF, JPEG or PNG file.`;
    }

    return null;
  }

  async function handleContinue() {
    setError(null);

    if (!docType) {
      setError("Please select a document type.");
      return;
    }

    if (!frontFile) {
      setError(
        "Please upload the front side of your document."
      );
      return;
    }

    const frontError =
      validateFile(frontFile);

    const backError =
      validateFile(backFile);

    if (frontError || backError) {
      setError(frontError ?? backError);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append(
        "documentType",
        docType
      );

      formData.append(
        "front",
        frontFile
      );

      if (backFile) {
        formData.append(
          "back",
          backFile
        );
      }

      const response = await fetch(
        "/api/kyc/documents",
        {
          method: "POST",
          body: formData,
        }
      );

      const data: UploadResponse =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setError(
          data.error ??
            "Could not upload your document."
        );
        return;
      }

      router.push("/kyc/review");
    } catch {
      setError(
        "Could not connect to the document service. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <PageHeader
        title="Identity Verification"
        backHref="/kyc/personal-information"
      />

      <div className="max-w-lg mx-auto mt-6 bg-white rounded-2xl p-6 border border-indigo/10">
        <p className="text-sm text-indigo/60 mb-1">
          Step 2 of 3
        </p>

        <div className="w-full h-2 bg-indigo/10 rounded-full mb-6">
          <div className="w-2/3 h-2 bg-indigo rounded-full" />
        </div>

        <h2 className="font-heading text-lg font-bold text-indigo mb-4">
          Government ID
        </h2>

        <p className="text-sm text-indigo/60 mb-4">
          Choose your document
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              checked={
                docType === "national_id"
              }
              onChange={() =>
                setDocType("national_id")
              }
              className="accent-indigo"
            />
            National ID
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              checked={
                docType === "passport"
              }
              onChange={() =>
                setDocType("passport")
              }
              className="accent-indigo"
            />
            International Passport
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="docType"
              checked={
                docType === "driver_license"
              }
              onChange={() =>
                setDocType("driver_license")
              }
              className="accent-indigo"
            />
            Driver License
          </label>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-indigo">
              Front document
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) =>
                setFrontFile(
                  event.target.files?.[0] ??
                    null
                )
              }
              className="w-full border border-indigo/20 rounded-xl px-4 py-3"
            />

            {frontFile && (
              <p className="mt-1 text-xs text-indigo/60">
                {frontFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-indigo">
              Back document, when applicable
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) =>
                setBackFile(
                  event.target.files?.[0] ??
                    null
                )
              }
              className="w-full border border-indigo/20 rounded-xl px-4 py-3"
            />

            {backFile && (
              <p className="mt-1 text-xs text-indigo/60">
                {backFile.name}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-indigo/50 mb-6">
          Files are encrypted before being stored.
          Maximum size is 8 MB per file.
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={
            uploading ||
            !docType ||
            !frontFile
          }
          className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-50"
        >
          {uploading
            ? "Encrypting and uploading..."
            : "Continue to Review"}
        </button>
      </div>
    </main>
  );
}
