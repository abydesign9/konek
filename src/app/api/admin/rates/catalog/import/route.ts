import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { withTransaction } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

// Bulk price-sheet import. The console parses the uploaded file (CSV/TSV) in the
// browser and posts normalised rows here, so this endpoint stays a plain,
// validated upsert with no file-format handling.
//
// Upsert key is (vendor, service_type, external_id) — the same unique key the
// catalogue uses — so re-uploading a corrected sheet updates in place instead of
// duplicating. Rows are applied in ONE transaction: a malformed sheet leaves the
// catalogue untouched rather than half-priced.
interface ImportRow {
  serviceType?: unknown;
  externalId?: unknown;
  name?: unknown;
  network?: unknown;
  currency?: unknown;
  costMinor?: unknown;
  priceMinor?: unknown;
}

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
  const rows: ImportRow[] = Array.isArray(b?.rows) ? b.rows : [];
  const vendor = typeof b?.vendor === "string" && b.vendor.trim() ? b.vendor.trim() : "manual";
  const markupPct = Number.isFinite(Number(b?.markupPct)) ? Number(b.markupPct) : 20;
  const deactivateMissing = b?.deactivateMissing === true;

  if (rows.length === 0) return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "Too many rows (max 5000 per import)" }, { status: 400 });
  if (markupPct < 0 || markupPct > 500) {
    return NextResponse.json({ error: "markupPct must be between 0 and 500" }, { status: 400 });
  }

  const errors: string[] = [];
  const clean: {
    serviceType: string;
    externalId: string;
    name: string;
    network: string | null;
    currency: string;
    costMinor: number;
    priceMinor: number;
  }[] = [];

  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1 in the user's sheet
    const serviceType = String(r.serviceType ?? "").trim();
    const externalId = String(r.externalId ?? "").trim();
    const name = String(r.name ?? "").trim();
    const currency = String(r.currency ?? "NGN").trim().toUpperCase();
    const costMinor = Number(r.costMinor);
    const rawPrice = r.priceMinor === "" || r.priceMinor == null ? null : Number(r.priceMinor);

    if (!serviceType) return errors.push(`Line ${line}: service_type is required`);
    if (!externalId) return errors.push(`Line ${line}: external_id is required`);
    if (!name) return errors.push(`Line ${line}: name is required`);
    if (!/^[A-Z]{3}$/.test(currency)) return errors.push(`Line ${line}: currency must be a 3-letter code`);
    if (!Number.isFinite(costMinor) || costMinor < 0) return errors.push(`Line ${line}: cost is not a valid number`);

    // No price in the sheet -> derive it from cost with the markup.
    const priceMinor =
      rawPrice != null && Number.isFinite(rawPrice) && rawPrice > 0
        ? Math.round(rawPrice)
        : Math.ceil(costMinor * (1 + markupPct / 100));

    if (priceMinor <= 0) return errors.push(`Line ${line}: price must be greater than zero`);

    clean.push({
      serviceType,
      externalId,
      name,
      network: String(r.network ?? "").trim() || null,
      currency,
      costMinor: Math.round(costMinor),
      priceMinor,
    });
  });

  if (errors.length > 0) {
    // Reject the whole sheet — a partially-applied price list is worse than none.
    return NextResponse.json({ error: "Import rejected", errors: errors.slice(0, 25), rejected: errors.length }, { status: 400 });
  }

  const result = await withTransaction(async (client) => {
    let created = 0;
    let updated = 0;

    for (const r of clean) {
      const res = await client.query(
        `INSERT INTO catalog_items (vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (vendor, service_type, external_id) DO UPDATE
           SET name = EXCLUDED.name,
               network = COALESCE(EXCLUDED.network, catalog_items.network),
               cost_minor = EXCLUDED.cost_minor,
               price_minor = EXCLUDED.price_minor,
               currency = EXCLUDED.currency,
               active = true,
               synced_at = now()
         RETURNING (xmax = 0) AS inserted`,
        [vendor, r.serviceType, r.externalId, r.name, r.network, r.costMinor, r.priceMinor, r.currency]
      );
      if ((res.rows[0] as { inserted: boolean } | undefined)?.inserted) created++;
      else updated++;
    }

    // Optionally retire anything in the same vendor+service that wasn't in the
    // sheet (a full price-list replacement rather than a patch).
    let deactivated = 0;
    if (deactivateMissing) {
      const services = Array.from(new Set(clean.map((r) => r.serviceType)));
      const ids = clean.map((r) => r.externalId);
      const res = await client.query(
        `UPDATE catalog_items SET active = false
          WHERE vendor = $1 AND service_type = ANY($2::text[]) AND NOT (external_id = ANY($3::text[])) AND active = true`,
        [vendor, services, ids]
      );
      deactivated = res.rowCount ?? 0;
    }

    return { created, updated, deactivated };
  });

  await logAudit(admin.adminUserId, "catalog_price_sheet_imported", "catalog_item", vendor, {
    rows: clean.length,
    markupPct,
    ...result,
  });

  return NextResponse.json({ ok: true, rows: clean.length, ...result });
}
