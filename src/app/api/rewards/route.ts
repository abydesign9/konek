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
  const { rows: coinRows } = await query<{ coins: number | null }>(
    `SELECT coins FROM user_coin_balances WHERE user_id = $1`,
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
  const { rows: levelRows } = await query<{ name: string; perk_discount_pct: string }>(
    `SELECT l.name, l.perk_discount_pct FROM user_levels ul JOIN levels l ON l.id = ul.level_id WHERE ul.user_id = $1`,
    [userId]
  );
  const { rows: weeklyStreakRows } = await query<{ current_streak_weeks: number; longest_streak_weeks: number }>(
    `SELECT current_streak_weeks, longest_streak_weeks FROM streaks WHERE user_id = $1`,
    [userId]
  );
  const { rows: missions } = await query(
    `SELECT m.code, m.title, m.coin_reward, um.status
     FROM missions m
     LEFT JOIN user_missions um ON um.mission_id = m.id AND um.user_id = $1
     WHERE m.active = true`,
    [userId]
  );

  const dailyStreak = await getStreak(userId);

  return NextResponse.json({
    coins: coinRows[0]?.coins ?? 0,
    dailyStreak,
    weeklyStreak: weeklyStreakRows[0]?.current_streak_weeks ?? 0,
    longestWeeklyStreak: weeklyStreakRows[0]?.longest_streak_weeks ?? 0,
    level: levelRows[0]?.name ?? "bronze",
    perkDiscountPct: Number(levelRows[0]?.perk_discount_pct ?? 0),
    referralCode: userRows[0]?.referral_code,
    referralCount: Number(referralRows[0]?.count ?? 0),
    missions,
    history,
  });
}
