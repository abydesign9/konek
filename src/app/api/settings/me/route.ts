import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{ theme: string; language: string; biometric_enabled: boolean }>(
    `SELECT theme, language, biometric_enabled FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
