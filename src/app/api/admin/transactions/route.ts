import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("q")?.trim();

  const params: unknown[] = [];
  let sql = `
    SELECT t.id, t.type, t.status, t.currency, t.amount_minor, t.vendor, t.vendor_ref,
           t.failure_reason, t.recipient, t.created_at, u.phone
    FROM transactions t
    JOIN users u ON u.id = t.user_id
  `;
  if (search) {
    params.push(`%${search}%`);
    sql += ` WHERE u.phone ILIKE $1 OR t.id::text ILIKE $1 OR t.vendor_ref ILIKE $1 OR t.recipient->>'phone' ILIKE $1`;
  }
  sql += ` ORDER BY t.created_at DESC LIMIT 50`;

  const { rows } = await query(sql, params);
  return NextResponse.json({ transactions: rows });
}
