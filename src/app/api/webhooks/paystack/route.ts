import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { creditFromPayment } from "@/lib/wallet/creditFromPayment";

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const signatureValid = isValidSignature(rawBody, signature);

  let parsed: { event?: string; data?: { reference?: string } } = {};
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // store as-received below; parsed stays empty
  }

  const eventRow = await query<{ id: string }>(
    `INSERT INTO webhook_events (vendor, signature_valid, raw) VALUES ('paystack', $1, $2) RETURNING id`,
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
    if (parsed.event === "charge.success" && parsed.data?.reference) {
      await creditFromPayment(parsed.data.reference);
    }
    await query(`UPDATE webhook_events SET processed = true, processed_at = now() WHERE id = $1`, [eventId]);
  } catch (err) {
    await query(`UPDATE webhook_events SET error = $2 WHERE id = $1`, [
      eventId,
      err instanceof Error ? err.message : "unknown error",
    ]);
    // Still 200 so Paystack doesn't hammer retries for a processing bug we need to fix server-side.
  }

  return NextResponse.json({ received: true });
}
