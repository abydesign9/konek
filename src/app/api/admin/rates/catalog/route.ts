import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query(
    `SELECT id, vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, meta, active, synced_at
     FROM catalog_items ORDER BY service_type, network, price_minor`
  );
  return NextResponse.json({ items: rows });
}

// Create a new catalog item (a plan/product). Vendor defaults to "manual" for
// admin-authored products; catalog-sync-owned items keep their vendor id and can
// be overwritten by the next sync, so manual entries should use vendor=manual.
export async function POST(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const vendor = typeof b?.vendor === "string" && b.vendor.trim() ? b.vendor.trim() : "manual";
  const serviceType = b?.serviceType;
  const externalId = b?.externalId;
  const name = b?.name;
  const network = typeof b?.network === "string" && b.network.trim() ? b.network.trim() : null;
  const country = typeof b?.country === "string" && b.country.trim() ? b.country.trim() : null;
  const currency = typeof b?.currency === "string" ? b.currency.toUpperCase() : "NGN";
  const costMinor = b?.costMinor;
  const priceMinor = b?.priceMinor;
  const active = b?.active !== false;

  if (typeof serviceType !== "string" || !serviceType.trim()) {
    return NextResponse.json({ error: "serviceType is required" }, { status: 400 });
  }
  if (typeof externalId !== "string" || !externalId.trim()) {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "currency must be a 3-letter code" }, { status: 400 });
  }
  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    return NextResponse.json({ error: "priceMinor must be a positive integer (minor units)" }, { status: 400 });
  }
  if (costMinor != null && (!Number.isInteger(costMinor) || costMinor < 0)) {
    return NextResponse.json({ error: "costMinor must be a non-negative integer" }, { status: 400 });
  }

  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO catalog_items (vendor, service_type, external_id, name, network, country, cost_minor, price_minor, currency, meta, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        vendor,
        serviceType.trim(),
        externalId.trim(),
        name.trim(),
        network,
        country,
        costMinor ?? 0,
        priceMinor,
        currency,
        b?.meta && typeof b.meta === "object" ? JSON.stringify(b.meta) : null,
        active,
      ]
    );
    await logAudit(admin.adminUserId, "catalog_item_created", "catalog_item", rows[0].id, { serviceType, externalId, name });
    return NextResponse.json({ id: rows[0].id });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "An item with that vendor + service + external id already exists" }, { status: 409 });
    }
    throw err;
  }
}
