import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT sm.id, sm.subject, sm.body, sm.status, sm.created_at, u.phone
     FROM support_messages sm JOIN users u ON u.id = sm.user_id WHERE sm.id = $1`,
    [params.id]
  );
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { rows: replies } = await query(
    `SELECT id, author_type, author_id, body, created_at FROM support_replies WHERE message_id = $1 ORDER BY created_at ASC`,
    [params.id]
  );
  return NextResponse.json({ message: rows[0], replies });
}
