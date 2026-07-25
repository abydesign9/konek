import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// List promotions with a live report (claims, unlock rate, paid out), and create
// new ones. Gated on promotions.manage.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { rows } = await query(
    `SELECT p.*,
            (SELECT count(*) FROM promo_claims c WHERE c.promo_id = p.id) AS claims,
            (SELECT count(*) FROM promo_claims c WHERE c.promo_id = p.id AND c.status = 'unlocked') AS unlocked
       FROM promotions p ORDER BY p.created_at DESC`
  );
  return NextResponse.json({ promotions: rows });
}

const PROMO_TYPES = ["signup", "first_deposit", "va_activation", "card_creation", "card_cashback", "referral", "milestone", "seasonal", "custom"];
const REWARD_TYPES = ["wallet_locked", "wallet_instant", "free_card", "card_fee_waiver", "cashback_percent", "va_upgrade", "fee_discount"];

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "promotions.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const promoType = String(b?.promoType ?? "");
  const rewardType = String(b?.rewardType ?? "");
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!PROMO_TYPES.includes(promoType)) return NextResponse.json({ error: "invalid promoType" }, { status: 400 });
  if (!REWARD_TYPES.includes(rewardType)) return NextResponse.json({ error: "invalid rewardType" }, { status: 400 });

  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
  const validSpendTypes: string[] = Array.isArray(b?.validSpendTypes) ? b.validSpendTypes.filter((x: unknown) => typeof x === "string") : [];

  const { rows } = await query<{ id: string }>(
    `INSERT INTO promotions
       (name, promo_type, reward_type, target_audience, reward_amount_minor, reward_currency, cashback_pct,
        min_deposit_minor, min_spend_minor, valid_spend_types, milestone_minor, start_date, end_date,
        reward_expiry_days, user_cap, budget_cap_minor, status, notification_message, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, now()),$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      name,
      promoType,
      rewardType,
      ["NG", "INTL", "ALL"].includes(b?.targetAudience) ? b.targetAudience : "ALL",
      num(b?.rewardAmountMinor),
      (b?.rewardCurrency ?? "NGN").toUpperCase().slice(0, 3),
      b?.cashbackPct == null || b.cashbackPct === "" ? null : Number(b.cashbackPct),
      num(b?.minDepositMinor),
      num(b?.minSpendMinor),
      validSpendTypes,
      b?.milestoneMinor == null || b.milestoneMinor === "" ? null : num(b.milestoneMinor),
      b?.startDate || null,
      b?.endDate || null,
      b?.rewardExpiryDays == null || b.rewardExpiryDays === "" ? null : num(b.rewardExpiryDays),
      b?.userCap == null || b.userCap === "" ? 1 : num(b.userCap),
      b?.budgetCapMinor == null || b.budgetCapMinor === "" ? null : num(b.budgetCapMinor),
      b?.status === "paused" ? "paused" : "active",
      b?.notificationMessage ?? null,
      admin.adminUserId,
    ]
  );
  await logAudit(admin.adminUserId, "promo_created", "promotion", rows[0].id, { name, promoType, rewardType });
  return NextResponse.json({ id: rows[0].id });
}
