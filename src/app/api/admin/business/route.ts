import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT b.id, b.legal_name, b.business_type, b.kyb_status, u.phone, b.created_at
     FROM business_accounts b JOIN users u ON u.id = b.owner_user_id
     ORDER BY b.created_at DESC`
  );
  return NextResponse.json({ businesses: rows });
}
