import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getMembership } from "@/lib/business/teamService";

// M9 analytics: spend this month + all time, split by batch purpose and by
// service type (from delivered batch items). Every role can view.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const membership = await getMembership(userId);
  if (!membership) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const bizId = membership.businessAccountId;

  const { rows: totals } = await query<{ month_minor: string | null; all_minor: string | null; batches: string }>(
    `SELECT
       SUM(total_amount_minor) FILTER (WHERE created_at >= date_trunc('month', now())) AS month_minor,
       SUM(total_amount_minor) AS all_minor,
       COUNT(*) AS batches
     FROM bulk_batches WHERE business_account_id = $1`,
    [bizId]
  );

  const { rows: byPurpose } = await query<{ purpose: string; amount_minor: string; items: string }>(
    `SELECT purpose, SUM(total_amount_minor) AS amount_minor, SUM(total_items) AS items
     FROM bulk_batches WHERE business_account_id = $1
     GROUP BY purpose ORDER BY SUM(total_amount_minor) DESC`,
    [bizId]
  );

  const { rows: byService } = await query<{ service_type: string; delivered: string; failed: string; amount_minor: string }>(
    `SELECT i.recipient->>'serviceType' AS service_type,
            COUNT(*) FILTER (WHERE i.status = 'delivered') AS delivered,
            COUNT(*) FILTER (WHERE i.status = 'failed') AS failed,
            COALESCE(SUM((i.recipient->>'amountMinor')::bigint) FILTER (WHERE i.status = 'delivered'), 0) AS amount_minor
     FROM bulk_batch_items i
     JOIN bulk_batches b ON b.id = i.batch_id
     WHERE b.business_account_id = $1
     GROUP BY 1 ORDER BY 4 DESC`,
    [bizId]
  );

  return NextResponse.json({
    monthMinor: Number(totals[0]?.month_minor ?? 0),
    allTimeMinor: Number(totals[0]?.all_minor ?? 0),
    batchCount: Number(totals[0]?.batches ?? 0),
    byPurpose,
    byService,
  });
}
