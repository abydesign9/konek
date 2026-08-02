import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import { listVendors, addVendor, InvalidBankDetailsError, DuplicateVendorError } from "@/lib/business/businessVendorService";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const vendors = await listVendors(gate.membership.businessAccountId);
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  try {
    assertCanManageMoney(gate.membership.role);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
  }

  try {
    const { id } = await addVendor(gate.membership.businessAccountId, userId, {
      name: body.name,
      bankCode: body?.bankCode,
      accountNumber: body?.accountNumber,
    });
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof InvalidBankDetailsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof DuplicateVendorError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
