import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import {
  assertPermission,
  ForbiddenError,
} from "@/lib/admin/permissions";
import { withTransaction } from "@/lib/db";
import { KYC_TIER } from "@/lib/kyc/tiers";

class ApplicationNotFoundError extends Error {}

class ApplicationAlreadyReviewedError extends Error {}

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  const admin = getAdminSession();

  if (!admin) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    await assertPermission(
      admin.role,
      "kyc.review"
    );

    const result =
      await withTransaction(
        async (client) => {
          const { rows } =
            await client.query<{
              id: string;
              user_id: string;
              status: string;
              document_type: string;
            }>(
              `SELECT
                 id,
                 user_id,
                 status,
                 document_type
               FROM kyc_documents
               WHERE id = $1
               FOR UPDATE`,
              [params.id]
            );

          const application = rows[0];

          if (!application) {
            throw new ApplicationNotFoundError();
          }

          if (
            application.status !== "pending"
          ) {
            throw new ApplicationAlreadyReviewedError();
          }

          await client.query(
            `UPDATE kyc_documents
             SET status = 'approved',
                 rejection_reason = NULL,
                 reviewed_at = now(),
                 reviewed_by = $2,
                 updated_at = now()
             WHERE id = $1`,
            [
              application.id,
              admin.email,
            ]
          );

          await client.query(
            `UPDATE users
             SET kyc_tier = GREATEST(
                   kyc_tier,
                   $2
                 ),
                 kyc_status = 'verified',
                 updated_at = now()
             WHERE id = $1`,
            [
              application.user_id,
              KYC_TIER.FINANCE,
            ]
          );

          await client.query(
            `INSERT INTO audit_log (
               actor,
               action,
               entity,
               entity_id,
               detail
             )
             VALUES (
               $1,
               'admin_kyc_approved',
               'kyc_document',
               $2,
               $3
             )`,
            [
              admin.email,
              application.id,
              JSON.stringify({
                userId:
                  application.user_id,
                documentType:
                  application.document_type,
                approvedTier:
                  KYC_TIER.FINANCE,
              }),
            ]
          );

          return {
            userId:
              application.user_id,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      status: "approved",
      userId: result.userId,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (
      error instanceof
      ApplicationNotFoundError
    ) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof
      ApplicationAlreadyReviewedError
    ) {
      return NextResponse.json(
        {
          error:
            "This application has already been reviewed",
        },
        { status: 409 }
      );
    }

    console.error(
      "ADMIN KYC APPROVAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not approve the KYC application",
      },
      { status: 500 }
    );
  }
}
