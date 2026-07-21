import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getKycStatus } from "@/lib/kyc/kycService";
import { KYC_TIER } from "@/lib/kyc/tiers";
import {
  deletePrivateDocument,
  storePrivateDocument,
} from "@/lib/kyc/documentStorage";

const DOCUMENT_TYPES = new Set([
  "national_id",
  "passport",
  "driver_license",
]);

interface DocumentRow {
  id: string;
  document_type: string;
  front_original_name: string;
  back_original_name: string | null;
  front_mime_type: string;
  back_mime_type: string | null;
  status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401 }
    );
  }

  const { rows } = await query<DocumentRow>(
    `SELECT
       id,
       document_type,
       front_original_name,
       back_original_name,
       front_mime_type,
       back_mime_type,
       status,
       rejection_reason,
       submitted_at,
       reviewed_at,
       created_at
     FROM kyc_documents
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return NextResponse.json({
    document: rows[0] ?? null,
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401 }
    );
  }

  let frontStorageKey: string | null = null;
  let backStorageKey: string | null = null;
  let backOriginalName: string | null = null;

  try {
    const kyc = await getKycStatus(userId);

    const identityVerified =
      kyc.bvnVerified ||
      kyc.ninVerified ||
      kyc.tier >= KYC_TIER.TRANSACT;

    if (!identityVerified) {
      return NextResponse.json(
        {
          error:
            "Verify your BVN or NIN before uploading documents.",
        },
        { status: 403 }
      );
    }

    if (
      kyc.tier >= KYC_TIER.FINANCE &&
      kyc.status === "verified"
    ) {
      return NextResponse.json(
        {
          error:
            "Tier 2 verification has already been approved.",
        },
        { status: 409 }
      );
    }

    const { rows: pendingRows } = await query<{
      id: string;
    }>(
      `SELECT id
       FROM kyc_documents
       WHERE user_id = $1
         AND status = 'pending'
       LIMIT 1`,
      [userId]
    );

    if (pendingRows.length > 0) {
      return NextResponse.json(
        {
          error:
            "Your documents are already pending review.",
        },
        { status: 409 }
      );
    }

    const formData = await request.formData();

    const documentType =
      formData.get("documentType");

    const front = formData.get("front");
    const back = formData.get("back");

    if (
      typeof documentType !== "string" ||
      !DOCUMENT_TYPES.has(documentType)
    ) {
      return NextResponse.json(
        { error: "Select a valid document type." },
        { status: 400 }
      );
    }

    if (!(front instanceof File)) {
      return NextResponse.json(
        { error: "The front document is required." },
        { status: 400 }
      );
    }

    const frontBytes = Buffer.from(
      await front.arrayBuffer()
    );

    const storedFront =
      await storePrivateDocument({
        userId,
        bytes: frontBytes,
      });

    frontStorageKey =
      storedFront.storageKey;

    let storedBack:
      | Awaited<
          ReturnType<typeof storePrivateDocument>
        >
      | null = null;

    if (back instanceof File && back.size > 0) {
      const backBytes = Buffer.from(
        await back.arrayBuffer()
      );

      storedBack =
        await storePrivateDocument({
          userId,
          bytes: backBytes,
        });

      backStorageKey =
        storedBack.storageKey;

      backOriginalName = back.name;
    }

    const documentId = crypto.randomUUID();

    await query(
      `WITH superseded AS (
         UPDATE kyc_documents
         SET status = 'superseded',
             updated_at = now()
         WHERE user_id = $1
           AND status IN ('uploaded', 'rejected')
       )
       INSERT INTO kyc_documents (
         id,
         user_id,
         document_type,
         front_storage_key,
         back_storage_key,
         front_original_name,
         back_original_name,
         front_mime_type,
         back_mime_type,
         status
       )
       VALUES (
         $2,
         $1,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         'uploaded'
       )`,
      [
        userId,
        documentId,
        documentType,
        storedFront.storageKey,
        storedBack?.storageKey ?? null,
        front.name,
        backOriginalName,
        storedFront.mimeType,
        storedBack?.mimeType ?? null,
      ]
    );

    await logAudit(
      userId,
      "kyc_documents_uploaded",
      "user",
      userId,
      {
        documentId,
        documentType,
        hasBackDocument: storedBack !== null,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        documentId,
        status: "uploaded",
      },
      { status: 201 }
    );
  } catch (error) {
    if (frontStorageKey) {
      await deletePrivateDocument(
        frontStorageKey
      ).catch(() => undefined);
    }

    if (backStorageKey) {
      await deletePrivateDocument(
        backStorageKey
      ).catch(() => undefined);
    }

    console.error(
      "KYC DOCUMENT UPLOAD ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Could not upload the document";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Could not upload the document",
      },
      { status: 500 }
    );
  }
}
