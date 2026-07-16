import { NextRequest, NextResponse } from "next/server";
import { refreshVendorHealth } from "@/vendors/registry";
import { dispatchDueCampaigns } from "@/lib/notifications/campaigns";

// The one worker this app has: a single endpoint a scheduler calls on an
// interval (Vercel Cron in prod — see vercel.json; scripts/cron_dev.mjs
// polls it locally). Everything "scheduled" or "recurring" in this app
// (vendor health, notification campaigns, and — once built — recurring
// intl top-up and bulk distributions) is real config sitting in Postgres
// with nothing to make it fire on its own; this route is that trigger.
// Same auth convention as /api/admin/catalog-sync.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await refreshVendorHealth();
  const { dispatched } = await dispatchDueCampaigns();

  return NextResponse.json({ ok: true, campaignsDispatched: dispatched, ranAt: new Date().toISOString() });
}

// Vercel Cron invokes GET with an Authorization: Bearer <CRON_SECRET>
// header (its own convention, distinct from the x-cron-secret header used
// by manual/dev POST calls) — support both so the same route works from
// vercel.json without a wrapper.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await refreshVendorHealth();
  const { dispatched } = await dispatchDueCampaigns();

  return NextResponse.json({ ok: true, campaignsDispatched: dispatched, ranAt: new Date().toISOString() });
}
