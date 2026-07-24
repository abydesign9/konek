import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// KYC configuration surface for admins: read the whole model (methods,
// providers, requirement matrix) and create/update/deactivate requirement rows.
// Everything a compliance/ops person needs to onboard a new country lives here —
// no code change, no deploy.

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [methods, providers, requirements] = await Promise.all([
    query(`SELECT code, label, kind, validation_regex, active FROM verification_methods ORDER BY code`),
    query(`SELECT id, name, adapter_key, countries, methods, priority, enabled FROM kyc_providers ORDER BY priority`),
    query(`SELECT id, country_code, tier, method_groups, label, active FROM kyc_requirements
             ORDER BY COALESCE(country_code, ''), tier`),
  ]);
  return NextResponse.json({
    methods: methods.rows,
    providers: providers.rows,
    requirements: requirements.rows,
  });
}

type AdminSession = NonNullable<ReturnType<typeof getAdminSession>>;

// Returns the admin session, or a NextResponse to short-circuit with.
async function gate(): Promise<AdminSession | NextResponse> {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "kyc.config");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
  return admin;
}

function validGroups(v: unknown): v is string[][] {
  return Array.isArray(v) && v.every((g) => Array.isArray(g) && g.length > 0 && g.every((m) => typeof m === "string"));
}

// Create or update a requirement row. Upsert is keyed by (country, tier) to match
// the unique index, so editing NG tier 1 twice never creates a duplicate.
export async function POST(req: NextRequest) {
  const g = await gate();
  if (g instanceof NextResponse) return g;

  const b = await req.json().catch(() => null);
  const country = b?.countryCode ? String(b.countryCode).toUpperCase() : null;
  const tier = Number(b?.tier);
  const methodGroups = b?.methodGroups;
  const label = typeof b?.label === "string" ? b.label : null;

  if (!Number.isInteger(tier) || tier < 1 || tier > 9) {
    return NextResponse.json({ error: "tier must be an integer 1–9" }, { status: 400 });
  }
  if (!validGroups(methodGroups)) {
    return NextResponse.json({ error: "methodGroups must be a non-empty array of method-code arrays" }, { status: 400 });
  }

  // Guard against typos: every referenced method must exist.
  const { rows: known } = await query<{ code: string }>(`SELECT code FROM verification_methods`);
  const codes = new Set(known.map((r) => r.code));
  const bad = methodGroups.flat().filter((m) => !codes.has(m));
  if (bad.length) return NextResponse.json({ error: `Unknown method(s): ${bad.join(", ")}` }, { status: 400 });

  const { rows } = await query<{ id: string }>(
    `INSERT INTO kyc_requirements (country_code, tier, method_groups, label, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (COALESCE(country_code, '*'), tier) DO UPDATE
       SET method_groups = EXCLUDED.method_groups, label = EXCLUDED.label, active = true, updated_at = now()
     RETURNING id`,
    [country, tier, JSON.stringify(methodGroups), label]
  );
  await logAudit(g.adminUserId, "kyc_requirement_upserted", "kyc_requirement", rows[0].id, { country, tier, methodGroups });
  return NextResponse.json({ id: rows[0].id });
}

// Toggle a provider on/off or change its priority (routing).
export async function PATCH(req: NextRequest) {
  const g = await gate();
  if (g instanceof NextResponse) return g;

  const b = await req.json().catch(() => null);
  const providerId = typeof b?.providerId === "string" ? b.providerId : "";
  if (!providerId) return NextResponse.json({ error: "providerId is required" }, { status: 400 });

  const sets: string[] = [];
  const params: unknown[] = [providerId];
  if (typeof b.enabled === "boolean") {
    params.push(b.enabled);
    sets.push(`enabled = $${params.length}`);
  }
  if (Number.isFinite(Number(b.priority))) {
    params.push(Number(b.priority));
    sets.push(`priority = $${params.length}`);
  }
  if (sets.length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  await query(`UPDATE kyc_providers SET ${sets.join(", ")} WHERE id = $1`, params);
  await logAudit(g.adminUserId, "kyc_provider_updated", "kyc_provider", providerId, {
    enabled: b.enabled,
    priority: b.priority,
  });
  return NextResponse.json({ ok: true });
}

// Deactivate a requirement row.
export async function DELETE(req: NextRequest) {
  const g = await gate();
  if (g instanceof NextResponse) return g;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await query(`UPDATE kyc_requirements SET active = false, updated_at = now() WHERE id = $1`, [id]);
  await logAudit(g.adminUserId, "kyc_requirement_deactivated", "kyc_requirement", id, {});
  return NextResponse.json({ ok: true });
}
