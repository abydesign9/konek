import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { BusinessNotVerifiedError, createBulkBatch, processBulkBatch } from "@/lib/bulk/bulkBatchService";

const VALID_SERVICE_TYPES = ["airtime", "data"];
const VALID_NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: biz } = await query<{ id: string }>(`SELECT id FROM business_accounts WHERE owner_user_id = $1`, [userId]);
  if (!biz[0]) return NextResponse.json({ batches: [] });

  const { rows } = await query(
    `SELECT id, purpose, total_items, total_amount_minor, status, created_at, completed_at
     FROM bulk_batches WHERE business_account_id = $1 ORDER BY created_at DESC`,
    [biz[0].id]
  );
  return NextResponse.json({ batches: rows });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: biz } = await query<{ id: string }>(`SELECT id FROM business_accounts WHERE owner_user_id = $1`, [userId]);
  if (!biz[0]) return NextResponse.json({ error: "no business account — apply first" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { purpose, items } = body ?? {};

  if (typeof purpose !== "string") return NextResponse.json({ error: "purpose is required" }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }
  for (const item of items) {
    if (!VALID_SERVICE_TYPES.includes(item.serviceType) || !VALID_NETWORKS.includes(item.network)
      || typeof item.phone !== "string" || item.phone.length < 10
      || !Number.isInteger(item.amountMinor) || item.amountMinor <= 0) {
      return NextResponse.json({ error: "each item needs valid serviceType, network, phone, amountMinor" }, { status: 400 });
    }
  }

  try {
    const { batchId } = await createBulkBatch(biz[0].id, userId, purpose, items);
    const result = await processBulkBatch(batchId);
    return NextResponse.json({ batchId, ...result });
  } catch (err) {
    if (err instanceof BusinessNotVerifiedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
