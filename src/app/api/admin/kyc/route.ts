import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import {
  assertPermission,
  ForbiddenError,
} from "@/lib/admin/permissions";
import { query } from "@/lib/db";

interface PendingKycApplication {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  document_type: string;
  front_original_name: string;
  back_original_name: string | null;
  front_mime_type: string;
  back_mime_type: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  bvn_verified: boolean;
  nin_verified: boolean;
  kyc_tier: number;
  kyc_status: string;
}

export async function GET() {
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

    const { rows } =
      await query<PendingKycApplication>(
        `SELECT
           kd.id,
           kd.user_id,
           u.full_name,
           u.phone,
           u.email,
           kd.document_type,
           kd.front_original_name,
           kd.back_original_name,
           kd.front_mime_type,
           kd.back_mime_type,
           kd.status,
           kd.submitted_at,
           kd.created_at,
           u.bvn_verified,
           u.nin_verified,
           u.kyc_tier,
           u.kyc_status
         FROM kyc_documents kd
         JOIN users u
           ON u.id = kd.user_id
         WHERE kd.status = 'pending'
         ORDER BY
           kd.submitted_at ASC NULLS LAST,
           kd.created_at ASC`
      );

    return NextResponse.json({
      applications: rows,
      total: rows.length,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error(
      "ADMIN KYC QUEUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not load the KYC review queue",
      },
      { status: 500 }
    );
  }
}
