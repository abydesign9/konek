"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";
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
  bankVerified?: boolean;
  livenessVerified: boolean;
  duplicateFlag?: boolean;
  error?: string;
}

export default function KycGate({
  children,
  requirements,
  featureName,
}: KycGateProps) {
  const [status, setStatus] =
    useState<VerificationStatus | null>(null);

  const [loadingError, setLoadingError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          "/api/verification/status",
          {
            cache: "no-store",
          }
        );

        const data: VerificationStatus =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Status request failed"
          );
        }

        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setLoadingError(true);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingError) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto rounded-3xl bg-white border border-red-200 p-6">
          <div className="text-4xl mb-4">
            ⚠️
          </div>

          <h1 className="font-heading text-xl font-bold text-indigo mb-3">
            Verification status unavailable
          </h1>

          <p className="text-sm text-indigo/60 mb-6">
            We could not check your verification status.
            Refresh the page and try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center text-indigo">
        Checking verification...
      </div>
    );
  }

  const checks: Record<Requirement, boolean> = {
    BVN_VERIFIED:
      status.bvnVerified ||
      status.ninVerified ||
      status.tier >= 1,

    KYC_APPROVED:
      status.tier >= 2 &&
      status.status === "verified",

    BANK_VERIFIED:
      status.bankVerified === true,

    LIVENESS_VERIFIED:
      status.livenessVerified === true,
  };

  const allowed = requirements.every(
    (requirement) => checks[requirement]
  );

  if (allowed) {
    return <>{children}</>;
  }

  const needsTierTwo =
    requirements.includes("KYC_APPROVED");

  const pendingTierTwo =
    needsTierTwo &&
    status.tier < 2 &&
    status.status === "pending";

  const rejectedTierTwo =
    needsTierTwo &&
    status.tier < 2 &&
    status.status === "rejected";

  if (pendingTierTwo) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto rounded-3xl bg-white border border-gold/30 p-6">
          <div className="text-4xl mb-4">
            🟡
          </div>

          <h1 className="font-heading text-xl font-bold text-indigo mb-3">
            Verification pending review
          </h1>

          <p className="text-sm text-indigo/60 mb-5">
            Your Tier 2 verification has already been
            submitted. Access to {featureName} will remain
            locked until the compliance review is completed.
          </p>

          <div className="rounded-xl bg-gold/10 border border-gold/20 p-4 mb-6">
            <p className="text-sm font-semibold text-indigo">
              Current status
            </p>

            <p className="text-sm text-indigo/60 mt-1">
              Pending compliance review
            </p>
          </div>

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
      </main>
    );
  }

  if (rejectedTierTwo) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto rounded-3xl bg-white border border-red-200 p-6">
          <div className="text-4xl mb-4">
            ⚠️
          </div>

          <h1 className="font-heading text-xl font-bold text-indigo mb-3">
            Verification needs attention
          </h1>

          <p className="text-sm text-indigo/60 mb-6">
            Your Tier 2 verification was not approved.
            Review your information and submit it again before
            accessing {featureName}.
          </p>

          <Link
            href="/kyc"
            className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"
          >
            Review Verification
          </Link>
        </div>
      </main>
    );
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
                  "Tier 2 KYC Approval"}

                {item === "BANK_VERIFIED" &&
                  "Bank Verification"}

                {item === "LIVENESS_VERIFIED" &&
                  "Additional Security Check"}
              </span>

              <span>
                {checks[item] ? "✅" : "⭕"}
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
