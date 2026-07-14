import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { createPartnerAccount } from "@/lib/partners/partnerService";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT pa.id, pa.partner_name, pa.revenue_share_pct, pa.allowed_services, pa.status, ba.legal_name
     FROM partner_accounts pa JOIN business_accounts ba ON ba.id = pa.business_account_id
     ORDER BY pa.created_at DESC`
  );
  return NextResponse.json({ partners: rows });
}

export async function POST(req: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { businessAccountId, partnerName, revenueSharePct, allowedServices } = body ?? {};

  if (typeof businessAccountId !== "string" || typeof partnerName !== "string") {
    return NextResponse.json({ error: "businessAccountId and partnerName are required" }, { status: 400 });
  }
  const pct = typeof revenueSharePct === "number" ? revenueSharePct : 0.2;
  const services = Array.isArray(allowedServices) && allowedServices.length > 0 ? allowedServices : ["airtime", "data"];

  const result = await createPartnerAccount(businessAccountId, partnerName, pct, services, "admin");
  return NextResponse.json(result);
}
