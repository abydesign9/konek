import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageTeam, ForbiddenRoleError } from "@/lib/business/teamService";
import { query } from "@/lib/db";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { logAudit } from "@/lib/audit";

// Notification preferences and brand mark — owner/admin only, same bar as
// managing the team.
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  try {
    assertCanManageTeam(gate.membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const sets: string[] = [];
  const vals: unknown[] = [gate.membership.businessAccountId];

  if (typeof body?.notifyFailedDistributions === "boolean") {
    vals.push(body.notifyFailedDistributions);
    sets.push(`notify_failed_distributions = $${vals.length}`);
  }
  if (typeof body?.notifyLowBalance === "boolean") {
    vals.push(body.notifyLowBalance);
    sets.push(`notify_low_balance = $${vals.length}`);
  }
  if (body?.lowBalanceThresholdMinor != null) {
    const threshold = Number(body.lowBalanceThresholdMinor);
    if (!Number.isInteger(threshold) || threshold < 0) {
      return NextResponse.json({ error: "lowBalanceThresholdMinor must be a non-negative integer" }, { status: 400 });
    }
    vals.push(threshold);
    sets.push(`low_balance_threshold_minor = $${vals.length}`);
  }
  if (body?.brandEmoji !== undefined) {
    if (body.brandEmoji !== null && !AVATAR_PRESETS.includes(body.brandEmoji)) {
      return NextResponse.json({ error: "brandEmoji must be one of the preset options" }, { status: 400 });
    }
    vals.push(body.brandEmoji);
    sets.push(`brand_emoji = $${vals.length}`);
  }

  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  await query(`UPDATE business_accounts SET ${sets.join(", ")} WHERE id = $1`, vals);
  await logAudit(userId, "business_settings_updated", "business_account", gate.membership.businessAccountId, {
    businessId: gate.membership.businessAccountId,
    updated: Object.keys(body ?? {}),
  });
  return NextResponse.json({ ok: true });
}
