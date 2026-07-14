import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mockVtuAdapter } from "@/vendors/mockVtu";
import { VendorAdapter, VendorServiceType } from "@/vendors/types";

// Catalog is synced from the primary (priority 1) vendor only — the plan
// list is presented to users independent of which vendor ultimately
// fulfils it, since selectVendor() decides that at purchase time, not
// catalog browse time. Syncing from every vendor would just duplicate
// identical-looking plans.
const ADAPTERS: VendorAdapter[] = [mockVtuAdapter];
const SYNCED_SERVICE_TYPES: VendorServiceType[] = ["data", "cable", "exam_pin", "gift_card", "esim"];

// Triggered by a cron job in production (Vercel Cron / worker) or manually
// in dev. Guarded by CRON_SECRET so it isn't a public write endpoint.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let synced = 0;
  for (const adapter of ADAPTERS) {
    if (!adapter.listPlans) continue;
    for (const serviceType of SYNCED_SERVICE_TYPES) {
      const plans = await adapter.listPlans(serviceType);
      for (const plan of plans) {
        await query(
          `INSERT INTO catalog_items (vendor, service_type, external_id, name, network, cost_minor, price_minor, currency, meta, active, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, now())
           ON CONFLICT (vendor, service_type, external_id)
           DO UPDATE SET name = EXCLUDED.name, cost_minor = EXCLUDED.cost_minor, price_minor = EXCLUDED.price_minor,
                          meta = EXCLUDED.meta, active = true, synced_at = now()`,
          [
            adapter.id,
            serviceType,
            plan.externalId,
            plan.name,
            plan.network,
            plan.costMinor,
            plan.priceMinor,
            plan.currency,
            JSON.stringify(plan.meta ?? {}),
          ]
        );
        synced += 1;
      }
    }
  }

  return NextResponse.json({ synced });
}
