import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Bulk catalog actions: activate, deactivate, or delete many products at once.
// Deactivate hides them from the store; delete removes them and their supplier
// links (for junk imports).
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
  const action = b?.action as "activate" | "deactivate" | "delete";
  if (ids.length === 0) return NextResponse.json({ error: "ids is required" }, { status: 400 });
  if (!["activate", "deactivate", "delete"].includes(action)) {
    return NextResponse.json({ error: "action must be activate, deactivate or delete" }, { status: 400 });
  }

  let affected = 0;
  if (action === "delete") {
    await query(`DELETE FROM supplier_products WHERE catalog_product_id = ANY($1)`, [ids]);
    const res = await query(`DELETE FROM catalog_products WHERE id = ANY($1)`, [ids]);
    affected = res.rowCount ?? 0;
  } else {
    const res = await query(
      `UPDATE catalog_products SET active = $2, updated_at = now() WHERE id = ANY($1)`,
      [ids, action === "activate"]
    );
    affected = res.rowCount ?? 0;
  }

  await logAudit(admin.adminUserId, "marketplace_bulk_action", "catalog_product", ids.join(","), { action, count: affected });
  return NextResponse.json({ ok: true, affected });
}
