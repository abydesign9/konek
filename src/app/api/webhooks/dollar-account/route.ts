import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { creditDollarInflow } from "@/lib/dollarAccount/dollarAccountService";

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FINCRA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fincra-signature");
  const signatureValid = isValidSignature(rawBody, signature);

  let parsed: { event?: string; data?: { inflowRef?: string } } = {};
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // stored as-received below
  }

  const eventRow = await query<{ id: string }>(
    `INSERT INTO webhook_events (vendor, signature_valid, raw) VALUES ('mock_fincra', $1, $2) RETURNING id`,
    [signatureValid, rawBody ? JSON.parse(rawBody || "{}") : {}]
  );
  const eventId = eventRow.rows[0].id;

  if (!signatureValid) {
    await query(
      `UPDATE webhook_events SET processed = true, processed_at = now(), error = 'invalid signature' WHERE id = $1`,
      [eventId]
    );
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    if (parsed.event === "inflow.received" && parsed.data?.inflowRef) {
      await creditDollarInflow(parsed.data.inflowRef);
    }
    await query(`UPDATE webhook_events SET processed = true, processed_at = now() WHERE id = $1`, [eventId]);
  } catch (err) {
    await query(`UPDATE webhook_events SET error = $2 WHERE id = $1`, [
      eventId,
      err instanceof Error ? err.message : "unknown error",
    ]);
  }

  return NextResponse.json({ received: true });
}
