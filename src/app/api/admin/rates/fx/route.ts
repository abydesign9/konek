import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getFxRateConfig } from "@/lib/fx";
import { setConfigValue } from "@/lib/config/platformConfig";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getFxRateConfig());
}

export async function PATCH(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ngnPerUsd = body?.ngnPerUsd;
  const usdNgnSpreadPct = body?.usdNgnSpreadPct;

  if (!Number.isFinite(ngnPerUsd) || ngnPerUsd <= 0) {
    return NextResponse.json({ error: "ngnPerUsd must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(usdNgnSpreadPct) || usdNgnSpreadPct < 0 || usdNgnSpreadPct >= 1) {
    return NextResponse.json({ error: "usdNgnSpreadPct must be between 0 and 1" }, { status: 400 });
  }

  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  await setConfigValue("fx_rate", { ngnPerUsd, usdNgnSpreadPct }, admin.adminUserId);
  return NextResponse.json({ ok: true });
}
