import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getVendorMonitoring } from "@/lib/vendors/vendorMonitoring";

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ vendors: await getVendorMonitoring() });
}
