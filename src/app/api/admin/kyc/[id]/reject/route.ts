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
  request: Request,
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

    const body =
      await request
        .json()
        .catch(() => null);

    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : "";

    if (reason.length < 5) {
      return NextResponse.json(
        {
          error:
            "Provide a clear rejection reason",
        },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        {
          error:
            "Rejection reason must be 500 characters or fewer",
        },
        { status: 400 }
      );
    }

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
             SET status = 'rejected',
                 rejection_reason = $2,
                 reviewed_at = now(),
                 reviewed_by = $3,
                 updated_at = now()
             WHERE id = $1`,
            [
              application.id,
              reason,
              admin.email,
            ]
          );

          /*
           * Do not downgrade an already-approved
           * Tier 2 user because of a stale submission.
           */
          await client.query(
            `UPDATE users
             SET kyc_status = 'rejected',
                 updated_at = now()
             WHERE id = $1
               AND kyc_tier < $2`,
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
               'admin_kyc_rejected',
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
                reason,
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
      status: "rejected",
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
      "ADMIN KYC REJECTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not reject the KYC application",
      },
      { status: 500 }
    );
  }
}
