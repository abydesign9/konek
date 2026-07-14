import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query(
    `SELECT id, legal_name, business_type, kyb_status, created_at FROM business_accounts WHERE owner_user_id = $1`,
    [userId]
  );
  return NextResponse.json({ business: rows[0] ?? null });
}
