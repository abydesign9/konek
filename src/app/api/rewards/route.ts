import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getStreak } from "@/lib/rewards/getStreak";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: userRows } = await query<{ referral_code: string }>(
    `SELECT referral_code FROM users WHERE id = $1`,
    [userId]
  );
  const { rows: coinRows } = await query<{ total: string | null }>(
    `SELECT SUM(coins) AS total FROM reward_events WHERE user_id = $1`,
    [userId]
  );
  const { rows: history } = await query(
    `SELECT kind, coins, meta, created_at FROM reward_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  const { rows: referralRows } = await query<{ count: string }>(
    `SELECT count(*) FROM users WHERE referred_by = $1`,
    [userId]
  );

  const streak = await getStreak(userId);

  return NextResponse.json({
    coins: coinRows[0]?.total ? Number(coinRows[0].total) : 0,
    streak,
    referralCode: userRows[0]?.referral_code,
    referralCount: Number(referralRows[0]?.count ?? 0),
    history,
  });
}
