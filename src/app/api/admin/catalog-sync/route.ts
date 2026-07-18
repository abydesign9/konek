import { NextRequest, NextResponse } from "next/server";
import { runCatalogSync } from "@/lib/catalog/catalogSync";
import { getCatalogAdapters } from "@/vendors/registry";

// Manual catalog sync trigger (the cron tick runs it on a throttle). Delegates
// to the shared pipeline so manual and scheduled syncs apply identical margin
// protection, deactivation and history recording. Guarded by CRON_SECRET.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await runCatalogSync(getCatalogAdapters());
  const synced = results.reduce((n, r) => n + r.upserted, 0);
  return NextResponse.json({ synced, runs: results });
}
