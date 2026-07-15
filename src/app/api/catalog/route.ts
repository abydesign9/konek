import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const serviceType = req.nextUrl.searchParams.get("serviceType") ?? "data";
  const network = req.nextUrl.searchParams.get("network");

  const params: unknown[] = [serviceType];
  let sql = `SELECT id, external_id, name, network, price_minor, currency, meta FROM catalog_items WHERE service_type = $1 AND active = true`;
  if (network) {
    params.push(network);
    sql += ` AND network = $2`;
  }
  sql += ` ORDER BY price_minor ASC`;

  const { rows } = await query(sql, params);
  return NextResponse.json({ plans: rows });
}
