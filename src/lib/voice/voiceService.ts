import { query } from "@/lib/db";

// M8 Voice is deferred (future use). Only the dormant loyalty-perk accrual is
// kept: a qualifying purchase grants free minutes (a row, no money movement),
// and /api/voice/me reads the balance. The wallet-debiting call-placement path
// was removed — it moved real money against a mock provider with no idempotency,
// so it must not sit live. Re-introduce placeCall() only with a real provider,
// atomic settlement and idempotency (see the reservation pattern in M2).

// Loyalty perk, not a product — granted alongside a qualifying purchase, never
// sold directly. Called (best-effort) from purchaseVtuService.
export async function grantMinutesBundle(userId: string, minutes: number, source: string): Promise<void> {
  await query(
    `INSERT INTO minutes_bundles (user_id, minutes_granted, source, expires_at)
     VALUES ($1, $2, $3, now() + interval '30 days')`,
    [userId, minutes, source]
  );
}
