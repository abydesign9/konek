import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const serviceType = req.nextUrl.searchParams.get("serviceType");
  const params: unknown[] = [userId];
  let sql = `SELECT id, label, service_type, details, pinned FROM beneficiaries WHERE user_id = $1`;
  if (serviceType) {
    params.push(serviceType);
    sql += ` AND service_type = $2`;
  }
  sql += ` ORDER BY pinned DESC, created_at DESC LIMIT 20`;

  const { rows } = await query(sql, params);
  return NextResponse.json({ beneficiaries: rows });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { label, serviceType, details } = body ?? {};

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (typeof serviceType !== "string") {
    return NextResponse.json({ error: "serviceType is required" }, { status: 400 });
  }
  if (typeof details !== "object" || details === null) {
    return NextResponse.json({ error: "details is required" }, { status: 400 });
  }

  // De-dupe: same user + service type + phone shouldn't create duplicate chips.
  const existing = await query<{ id: string }>(
    `SELECT id FROM beneficiaries WHERE user_id = $1 AND service_type = $2 AND details->>'phone' = $3`,
    [userId, serviceType, details.phone ?? null]
  );
  if (existing.rows[0]) {
    return NextResponse.json({ id: existing.rows[0].id, deduped: true });
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO beneficiaries (user_id, label, service_type, details) VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, label.trim(), serviceType, JSON.stringify(details)]
  );
  return NextResponse.json({ id: rows[0].id });
}
