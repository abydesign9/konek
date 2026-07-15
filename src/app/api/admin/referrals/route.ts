import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows: totals } = await query<{
    total_referred: string;
    qualified: string;
    coins_paid: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM referral_conversions) AS total_referred,
       (SELECT COUNT(*) FROM referral_conversions WHERE status IN ('qualified', 'paid')) AS qualified,
       (SELECT SUM(coins) FROM reward_events WHERE kind = 'referral') AS coins_paid`
  );

  const { rows: topReferrers } = await query(
    `SELECT u.phone, u.referral_code,
            COUNT(rc.id) AS total_referred,
            COUNT(rc.id) FILTER (WHERE rc.status IN ('qualified', 'paid')) AS qualified
     FROM users u
     JOIN referral_codes code ON code.user_id = u.id
     LEFT JOIN referral_conversions rc ON rc.referral_code = code.code
     GROUP BY u.id, u.phone, u.referral_code
     HAVING COUNT(rc.id) > 0
     ORDER BY COUNT(rc.id) DESC
     LIMIT 20`
  );

  const { rows: recent } = await query(
    `SELECT rc.referral_code, ref.phone AS referrer_phone, u.phone AS referred_phone, rc.status, rc.created_at
     FROM referral_conversions rc
     JOIN referral_codes code ON code.code = rc.referral_code
     JOIN users ref ON ref.id = code.user_id
     JOIN users u ON u.id = rc.referred_user_id
     ORDER BY rc.created_at DESC
     LIMIT 50`
  );

  const totalReferred = Number(totals[0]?.total_referred ?? 0);
  const qualified = Number(totals[0]?.qualified ?? 0);

  return NextResponse.json({
    totalReferred,
    qualified,
    pending: totalReferred - qualified,
    coinsPaidOut: Number(totals[0]?.coins_paid ?? 0),
    topReferrers,
    recent,
  });
}
