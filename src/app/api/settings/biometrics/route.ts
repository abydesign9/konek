import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// This is a local app-lock, not a server-verified auth factor: the
// browser's own platform authenticator (Face ID/Touch ID/Windows Hello)
// refuses to hand back an assertion unless the right biometric unlocks
// the credential it created, so storing just the credential id is enough
// to gate re-entry to the app. It does not replace the password, and
// nothing here parses or verifies a WebAuthn signature server-side — that
// would be needed for step-up auth on a sensitive action, which is a
// separate, larger piece of work than "unlock the app on this device."
export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const enabled = body?.enabled;
  const credentialId = body?.credentialId;

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  if (enabled && (typeof credentialId !== "string" || !credentialId)) {
    return NextResponse.json({ error: "credentialId is required to enable biometrics" }, { status: 400 });
  }

  await query(
    `UPDATE users SET biometric_enabled = $2, biometric_credential_id = $3, updated_at = now() WHERE id = $1`,
    [userId, enabled, enabled ? credentialId : null]
  );
  await logAudit(userId, enabled ? "biometrics_enabled" : "biometrics_disabled", "user", userId);
  return NextResponse.json({ ok: true });
}
