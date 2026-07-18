import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getEsimActivation, EsimNotFoundError, EsimNotIssuedError } from "@/lib/esim/esimService";

// Activation details (SM-DP+, matching id, LPA string / QR payload) for
// installing an issued eSIM profile. Provider-agnostic.
export async function GET(_req: NextRequest, { params }: { params: { txnId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const activation = await getEsimActivation(params.txnId, userId);
    return NextResponse.json(activation);
  } catch (err) {
    if (err instanceof EsimNotFoundError) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (err instanceof EsimNotIssuedError) return NextResponse.json({ error: "eSIM not yet issued" }, { status: 409 });
    throw err;
  }
}
