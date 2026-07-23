import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { importSupplierPlans, type SupplierPlanInput } from "@/lib/marketplace/import";

// CSV import: the console parses the sheet and posts normalised supplier plans.
// Each row already carries the fields the matching engine needs.
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
  const supplierId = String(b?.supplierId ?? "").trim();
  const plans: SupplierPlanInput[] = Array.isArray(b?.plans) ? b.plans : [];
  if (!supplierId) return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  if (plans.length === 0) return NextResponse.json({ error: "no plans to import" }, { status: 400 });
  if (plans.length > 10000) return NextResponse.json({ error: "too many rows (max 10000)" }, { status: 400 });

  const result = await importSupplierPlans(supplierId, plans, {
    source: "csv",
    actor: admin.adminUserId,
    deactivateMissing: b?.deactivateMissing === true,
  });
  return NextResponse.json(result);
}
