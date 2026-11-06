import { query } from "@/lib/db";

export interface FeeEntry {
  id: string;
  kind: string;
  amount_minor: string;
  currency: string;
  description: string;
  created_at: string;
}

// raviion has no subscription/billing plan — a business only ever pays
// per-action fees (card creation, etc.). This is that statement: every fee
// already recorded in business_wallet_events, no separate billing system
// needed. Vendor transfers move the business's own money (not a fee) so
// they're excluded.
const FEE_KINDS = ["card_fee"];

export async function listFeeStatement(businessId: string): Promise<{ entries: FeeEntry[]; totalsByCurrency: Record<string, number> }> {
  const { rows } = await query<FeeEntry>(
    `SELECT id, kind, amount_minor, currency, description, created_at
     FROM business_wallet_events
     WHERE business_account_id = $1 AND kind = ANY($2)
     ORDER BY created_at DESC
     LIMIT 200`,
    [businessId, FEE_KINDS]
  );
  const totalsByCurrency: Record<string, number> = {};
  for (const r of rows) {
    totalsByCurrency[r.currency] = (totalsByCurrency[r.currency] ?? 0) + Number(r.amount_minor);
  }
  return { entries: rows, totalsByCurrency };
}
