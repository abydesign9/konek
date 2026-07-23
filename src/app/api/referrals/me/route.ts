import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// Real referral data for the Invite & Earn screen — nothing hardcoded.
// Code + count from users, earnings from reward_events (role=referrer),
// per-friend progress from referral_conversions.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const [{ rows: userRows }, { rows: earnedRows }, { rows: friends }] = await Promise.all([
    query<{ referral_code: string | null; username: string | null }>(
      `SELECT referral_code, username FROM users WHERE id = $1`,
      [userId]
    ),
    query<{ earned: string }>(
      `SELECT COALESCE(SUM(credit_minor), 0) AS earned FROM reward_events
       WHERE user_id = $1 AND kind = 'referral' AND meta->>'role' = 'referrer'`,
      [userId]
    ),
    query<{ full_name: string | null; created_at: string; status: string | null; referrer_credit_minor: string | null }>(
      `SELECT u.full_name, u.created_at, rc.status, rc.referrer_credit_minor
       FROM users u
       LEFT JOIN referral_conversions rc ON rc.referred_user_id = u.id
       WHERE u.referred_by = $1
       ORDER BY u.created_at DESC
       LIMIT 20`,
      [userId]
    ),
  ]);

  // The shareable handle is the username by default (readable), falling back to
  // the referral_code if they haven't set a username yet.
  const referralHandle = userRows[0]?.username ?? userRows[0]?.referral_code ?? null;
  return NextResponse.json({
    referralCode: userRows[0]?.referral_code ?? null,
    referralHandle,
    hasUsername: !!userRows[0]?.username,
    referralCount: friends.length,
    earnedMinor: Number(earnedRows[0]?.earned ?? 0),
    friends: friends.map((f) => {
      // First name only — the inviter doesn't need the friend's full identity.
      const firstName = (f.full_name ?? "").trim().split(/\s+/)[0] || "Friend";
      return {
        name: firstName,
        joinedAt: f.created_at,
        status: f.status ?? "pending",
        rewardMinor: f.referrer_credit_minor ? Number(f.referrer_credit_minor) : 0,
      };
    }),
  });
}
