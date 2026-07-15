import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { resetPin } from "@/lib/auth/pin";
import { sendNotification } from "@/lib/notifications/send";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  if (typeof phone !== "string" || !phone.trim()) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "support.reply");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { rows } = await query<{ id: string; had_pin: boolean }>(
    `SELECT id, (pin_hash IS NOT NULL) AS had_pin FROM users WHERE phone = $1`,
    [phone.trim()]
  );
  if (!rows[0]) return NextResponse.json({ error: "No customer with that phone number" }, { status: 404 });

  await resetPin(rows[0].id, admin.adminUserId);
  await sendNotification(
    rows[0].id,
    "push",
    "support",
    "Your transaction PIN was reset",
    "An admin reset your PIN for security. Set a new one next time you make a purchase."
  );
  return NextResponse.json({ ok: true, hadPin: rows[0].had_pin });
}
