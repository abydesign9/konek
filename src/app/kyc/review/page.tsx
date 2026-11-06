"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface SubmissionResponse {
  tier?: number;
  status?: string;
  error?: string;
}

export default function KycReviewPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitKyc() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: SubmissionResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          data.error ??
            "Could not submit your verification for review."
        );
        return;
      }

      if (
        data.status !== "pending" &&
        Number(data.tier ?? 0) < 2
      ) {
        setError(
          "Your verification could not be placed under review."
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError(
        "Could not connect to the verification service. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
              Pending Review
            </h1>

            <p className="text-sm text-indigo/60 mb-6">
              Your Tier 2 verification request has been submitted.
              Features that require Tier 2 will remain locked until
              the compliance review is completed.
            </p>

            <Link
              href="/kyc/status"
              className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"
            >
              View Verification Status
            </Link>

            <Link
              href="/home"
              className="block text-center text-sm text-indigo mt-4"
            >
              Return Home
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
        backHref="/kyc/document"
      />

      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <p className="text-sm text-indigo/60 mb-3">
            Final step
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
            Confirm that the required verification information has
            been provided before submitting your Tier 2 request.
          </p>

          <div className="space-y-3 mb-6">
            <ReviewItem
              title="Personal Information"
              description="Profile details completed"
            />

            <ReviewItem
              title="BVN or NIN Verification"
              description="Identity verification completed"
            />

            <ReviewItem
              title="Identity Information"
              description="Information matching completed"
            />

            <ReviewItem
              title="Government Document"
              description="Document selected for submission"
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submitKyc}
            disabled={submitting}
            className="w-full rounded-xl bg-indigo text-white py-3 font-semibold disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit for Review"}
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
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-indigo/5 p-4">
      <div className="h-8 w-8 rounded-full bg-raviion-green/20 flex items-center justify-center text-raviion-green font-bold">
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
