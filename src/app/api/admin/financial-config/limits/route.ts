import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Upsert one transaction-limit cell (tier x metric x currency -> max). These
// rows are read live by checkLimits, so a change takes effect immediately.
const METRICS = ["daily_spend", "single_txn", "weekly_spend", "new_account_daily"];

export async function PUT(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const tier = Number(b?.kycTier);
  const metric = String(b?.metric ?? "");
  const currency = String(b?.currency ?? "").toUpperCase().slice(0, 3);
  const maxMinor = Math.round(Number(b?.maxMinor));
  if (!Number.isInteger(tier) || tier < 0 || tier > 9) return NextResponse.json({ error: "invalid kycTier" }, { status: 400 });
  if (!METRICS.includes(metric)) return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "invalid currency" }, { status: 400 });
  if (!Number.isFinite(maxMinor) || maxMinor < 0) return NextResponse.json({ error: "invalid maxMinor" }, { status: 400 });

  await query(
    `INSERT INTO limits (kyc_tier, metric, currency, max_minor) VALUES ($1, $2, $3, $4)
     ON CONFLICT (kyc_tier, metric, currency) DO UPDATE SET max_minor = EXCLUDED.max_minor`,
    [tier, metric, currency, maxMinor]
  );
  await logAudit(admin.adminUserId, "limit_updated", "limit", `${currency}:${tier}:${metric}`, { maxMinor });
  return NextResponse.json({ ok: true });
}
