import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

// Gift cards the user has bought (delivered gift_card transactions). The code is
// stored in transactions.token; the brand/name comes from the catalog item the
// purchase referenced.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    token: string | null;
    amount_minor: string;
    created_at: string;
    network: string | null;
    name: string | null;
  }>(
    `SELECT t.id, t.token, t.amount_minor, t.created_at,
            t.recipient->>'network' AS network,
            c.name AS name
     FROM transactions t
     LEFT JOIN catalog_items c
       ON c.service_type = 'gift_card' AND c.external_id = t.recipient->>'planExternalId'
     WHERE t.user_id = $1 AND t.type = 'gift_card' AND t.status = 'delivered'
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [userId]
  );

  return NextResponse.json({
    cards: rows.map((r) => ({
      id: r.id,
      code: r.token,
      amountMinor: Number(r.amount_minor),
      brand: r.network ?? "Gift card",
      name: r.name,
      purchasedAt: r.created_at,
    })),
  });
}
