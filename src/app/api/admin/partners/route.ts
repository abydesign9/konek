import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { createPartnerAccount } from "@/lib/partners/partnerService";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT pa.id, pa.partner_name, pa.revenue_share_pct, pa.allowed_services, pa.status, ba.legal_name
     FROM partner_accounts pa JOIN business_accounts ba ON ba.id = pa.business_account_id
     ORDER BY pa.created_at DESC`
  );
  return NextResponse.json({ partners: rows });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { businessAccountId, partnerName, revenueSharePct, allowedServices } = body ?? {};

  if (typeof businessAccountId !== "string" || typeof partnerName !== "string") {
    return NextResponse.json({ error: "businessAccountId and partnerName are required" }, { status: 400 });
  }
  const pct = typeof revenueSharePct === "number" ? revenueSharePct : 0.2;
  const services = Array.isArray(allowedServices) && allowedServices.length > 0 ? allowedServices : ["airtime", "data"];

  try {
    // Creating a white-label partner grants API access + revenue share — gate it.
    await assertPermission(admin.role, "business.approve");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const result = await createPartnerAccount(businessAccountId, partnerName, pct, services, admin.email);
  return NextResponse.json(result);
}
