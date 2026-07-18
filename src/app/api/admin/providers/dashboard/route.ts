import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getProviderDashboard } from "@/lib/vendors/providerDashboard";

// Aggregated operations view: per-provider health/state, circuit, float, metrics
// (success/failure/timeout rate, p50/p95), routing decision, and last sync/webhook.
export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ providers: await getProviderDashboard() });
}
