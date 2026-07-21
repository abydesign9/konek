import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import {
  assertPermission,
  ForbiddenError,
} from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { readPrivateDocument } from "@/lib/kyc/documentStorage";

export const runtime = "nodejs";

interface DocumentFileRow {
  user_id: string;
  front_storage_key: string;
  back_storage_key: string | null;
  front_original_name: string;
  back_original_name: string | null;
  front_mime_type: string;
  back_mime_type: string | null;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: {
      id: string;
      side: string;
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

    if (
      params.side !== "front" &&
      params.side !== "back"
    ) {
      return NextResponse.json(
        {
          error:
            "Document side must be front or back",
        },
        { status: 400 }
      );
    }

    const { rows } =
      await query<DocumentFileRow>(
        `SELECT
           user_id,
           front_storage_key,
           back_storage_key,
           front_original_name,
           back_original_name,
           front_mime_type,
           back_mime_type
         FROM kyc_documents
         WHERE id = $1
         LIMIT 1`,
        [params.id]
      );

    const document = rows[0];

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const storageKey =
      params.side === "front"
        ? document.front_storage_key
        : document.back_storage_key;

    const originalName =
      params.side === "front"
        ? document.front_original_name
        : document.back_original_name;

    const mimeType =
      params.side === "front"
        ? document.front_mime_type
        : document.back_mime_type;

    if (
      !storageKey ||
      !originalName ||
      !mimeType
    ) {
      return NextResponse.json(
        {
          error:
            "This document side was not uploaded",
        },
        { status: 404 }
      );
    }

    const bytes =
      await readPrivateDocument({
        userId: document.user_id,
        storageKey,
      });

    const safeFilename =
      originalName.replace(
        /["\r\n]/g,
        "_"
      );

    return new Response(
      new Uint8Array(bytes),
      {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition":
            `inline; filename="${safeFilename}"`,
          "Cache-Control":
            "private, no-store, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options":
            "nosniff",
          "Content-Security-Policy":
            "sandbox",
        },
      }
    );
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error(
      "ADMIN KYC DOCUMENT VIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not open the KYC document",
      },
      { status: 500 }
    );
  }
}
