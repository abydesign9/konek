import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { requireVerifiedBusiness, assertCanManageMoney, ForbiddenRoleError } from "@/lib/business/teamService";
import {
  listBusinessVirtualAccounts,
  createBusinessDollarAccount,
  createBusinessNairaAccount,
  AlreadyHasBusinessAccountError,
} from "@/lib/business/businessAccountService";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });

  const accounts = await listBusinessVirtualAccounts(gate.membership.businessAccountId);
  return NextResponse.json({ accounts });
}

// Provision a dedicated NGN or USD receiving account for the business — the
// business equivalent of a customer's Naira/dollar account. Owner/admin/finance
// only (real infrastructure being stood up, not a viewer-level action).
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
  const currency = body?.currency;
  if (currency !== "NGN" && currency !== "USD") {
    return NextResponse.json({ error: "currency must be NGN or USD" }, { status: 400 });
  }

  try {
    if (currency === "USD") {
      const { id } = await createBusinessDollarAccount(gate.membership.businessAccountId, userId);
      return NextResponse.json({ id });
    }
    const { rows } = await query<{ legal_name: string }>(
      `SELECT legal_name FROM business_accounts WHERE id = $1`,
      [gate.membership.businessAccountId]
    );
    const { id } = await createBusinessNairaAccount(gate.membership.businessAccountId, rows[0]?.legal_name ?? "raviion Business", userId);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof AlreadyHasBusinessAccountError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
