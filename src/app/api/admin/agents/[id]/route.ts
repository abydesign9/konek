import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

const STATUSES = ["pending", "active", "suspended", "rejected", "closed"] as const;
const TIERS = ["bronze", "silver", "gold"] as const;

// Manage one agent: status (approve / suspend / reinstate), tier and commission
// rate. Rate is stored as a fraction (0.02 = 2%) and capped so a typo can't hand
// out a 500% commission on every downstream sale.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "agents.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const sets: string[] = [];
  const vals: unknown[] = [params.id];

  if ("status" in (b ?? {})) {
    if (!STATUSES.includes(b.status)) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
    }
    vals.push(b.status);
    sets.push(`status = $${vals.length}`);
    // Stamp the approval the first time they go active.
    if (b.status === "active") sets.push(`approved_at = COALESCE(approved_at, now())`);
  }

  if ("tier" in (b ?? {})) {
    if (!TIERS.includes(b.tier)) {
      return NextResponse.json({ error: `tier must be one of ${TIERS.join(", ")}` }, { status: 400 });
    }
    vals.push(b.tier);
    sets.push(`tier = $${vals.length}`);
  }

  if ("commissionRate" in (b ?? {})) {
    const rate = Number(b.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.25) {
      return NextResponse.json({ error: "commissionRate must be between 0 and 0.25 (25%)" }, { status: 400 });
    }
    vals.push(rate);
    sets.push(`commission_rate = $${vals.length}`);
  }

  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { rowCount } = await query(`UPDATE agents SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  await logAudit(admin.adminUserId, "agent_updated", "agent", params.id, b);
  return NextResponse.json({ ok: true });
}
