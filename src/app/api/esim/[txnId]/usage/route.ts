import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getEsimUsage, EsimNotFoundError, EsimNotIssuedError } from "@/lib/esim/esimService";

// Data usage + lifecycle status for an issued eSIM. Reads through the eSIM
// provider abstraction (mock is the reference) and reconciles against the sold
// allowance — no inline mock math.
export async function GET(_req: NextRequest, { params }: { params: { txnId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const usage = await getEsimUsage(params.txnId, userId);
    return NextResponse.json(usage);
  } catch (err) {
    if (err instanceof EsimNotFoundError) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (err instanceof EsimNotIssuedError) return NextResponse.json({ error: "eSIM not yet issued" }, { status: 409 });
    throw err;
  }
}
