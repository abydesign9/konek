import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getKycStatus } from "@/lib/kyc/kycService";
import { KYC_TIER } from "@/lib/kyc/tiers";

export async function POST() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const current =
      await getKycStatus(userId);

    const identityVerified =
      current.bvnVerified ||
      current.ninVerified ||
      current.tier >= KYC_TIER.TRANSACT;

    if (!identityVerified) {
      return NextResponse.json(
        {
          error:
            "Verify your BVN or NIN before submitting Tier 2 verification.",
          code: "identity_verification_required",
        },
        { status: 403 }
      );
    }

    if (
      current.tier >= KYC_TIER.FINANCE &&
      current.status === "verified"
    ) {
      return NextResponse.json(current);
    }

    const { rows: pendingDocuments } =
      await query<{ id: string }>(
        `SELECT id
         FROM kyc_documents
         WHERE user_id = $1
           AND status = 'pending'
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [userId]
      );

    if (
      current.status === "pending" &&
      pendingDocuments.length > 0
    ) {
      return NextResponse.json(current);
    }

    const { rows } =
      await query<{ document_id: string }>(
        `WITH selected_document AS (
           SELECT id
           FROM kyc_documents
           WHERE user_id = $1
             AND status = 'uploaded'
           ORDER BY created_at DESC
           LIMIT 1
         ),
         updated_document AS (
           UPDATE kyc_documents
           SET status = 'pending',
               submitted_at = now(),
               rejection_reason = NULL,
               updated_at = now()
           WHERE id = (
             SELECT id
             FROM selected_document
           )
           RETURNING id
         ),
         updated_user AS (
           UPDATE users
           SET kyc_status = 'pending',
               updated_at = now()
           WHERE id = $1
             AND EXISTS (
               SELECT 1
               FROM updated_document
             )
           RETURNING id
         )
         SELECT id AS document_id
         FROM updated_document`,
        [userId]
      );

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Upload a government document before submitting your verification.",
          code: "kyc_document_required",
        },
        { status: 422 }
      );
    }

    await logAudit(
      userId,
      "kyc_tier_two_submitted",
      "user",
      userId,
      {
        documentId:
          rows[0].document_id,
        previousTier: current.tier,
        previousStatus: current.status,
      }
    );

    return NextResponse.json(
      await getKycStatus(userId)
    );
  } catch (error) {
    console.error(
      "KYC SUBMISSION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not submit verification for review",
      },
      { status: 500 }
    );
  }
}
