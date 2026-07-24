import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Bulk catalogue actions: enable, disable, or delete many plans at once.
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
  const action = b?.action as "enable" | "disable" | "delete";
  if (ids.length === 0) return NextResponse.json({ error: "ids is required" }, { status: 400 });
  if (!["enable", "disable", "delete"].includes(action)) {
    return NextResponse.json({ error: "action must be enable, disable or delete" }, { status: 400 });
  }

  let affected = 0;
  if (action === "delete") {
    const res = await query(`DELETE FROM catalog_items WHERE id = ANY($1)`, [ids]);
    affected = res.rowCount ?? 0;
  } else {
    const res = await query(`UPDATE catalog_items SET active = $2 WHERE id = ANY($1)`, [ids, action === "enable"]);
    affected = res.rowCount ?? 0;
  }

  await logAudit(admin.adminUserId, "catalog_bulk_action", "catalog_item", ids.join(","), { action, count: affected });
  return NextResponse.json({ ok: true, affected });
}
