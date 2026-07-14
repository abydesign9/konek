import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { logAudit } from "@/lib/audit";
import { mockTwilioAdapter, VoiceAdapter } from "@/vendors/voice/mockTwilio";

const CURRENCY = "NGN";
const adapter: VoiceAdapter = mockTwilioAdapter;

// Loyalty perk, not a product — granted alongside a qualifying purchase,
// never sold directly. Called from purchaseVtuService.
export async function grantMinutesBundle(userId: string, minutes: number, source: string): Promise<void> {
  await query(
    `INSERT INTO minutes_bundles (user_id, minutes_granted, source, expires_at)
     VALUES ($1, $2, $3, now() + interval '30 days')`,
    [userId, minutes, source]
  );
}

export class InsufficientBalanceForCallError extends Error {
  constructor() {
    super("Wallet balance is insufficient to cover this call beyond your free minutes");
    this.name = "InsufficientBalanceForCallError";
  }
}

async function availableBundleMinutes(userId: string): Promise<number> {
  const { rows } = await query<{ remaining: string | null }>(
    `SELECT SUM(minutes_granted - minutes_used) AS remaining FROM minutes_bundles
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > now())`,
    [userId]
  );
  return rows[0]?.remaining ? Math.max(0, Number(rows[0].remaining)) : 0;
}

async function consumeBundleMinutes(userId: string, minutes: number): Promise<number> {
  const { rows } = await query<{ id: string; minutes_granted: number; minutes_used: number }>(
    `SELECT id, minutes_granted, minutes_used FROM minutes_bundles
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > now()) AND minutes_used < minutes_granted
     ORDER BY created_at ASC`,
    [userId]
  );

  let remaining = minutes;
  for (const bundle of rows) {
    if (remaining <= 0) break;
    const available = bundle.minutes_granted - bundle.minutes_used;
    const take = Math.min(available, remaining);
    await query(`UPDATE minutes_bundles SET minutes_used = minutes_used + $2 WHERE id = $1`, [bundle.id, take]);
    remaining -= take;
  }

  return minutes - remaining; // actually consumed
}

export async function placeCall(
  userId: string,
  toNumber: string,
  durationSeconds: number
): Promise<{ callSessionId: string; billedFromBundle: number; costMinor: number }> {
  const result = await adapter.placeCall(toNumber, durationSeconds);
  const minutesNeeded = Math.ceil(durationSeconds / 60);

  const available = await availableBundleMinutes(userId);
  const fromBundle = Math.min(available, minutesNeeded);
  const overageMinutes = minutesNeeded - fromBundle;
  const overageCostMinor = overageMinutes > 0 ? Math.round((overageMinutes / minutesNeeded) * result.costMinor) : 0;

  if (overageCostMinor > 0) {
    const walletAccountId = await getUserWalletAccount(userId, CURRENCY);
    const balance = await getBalance(walletAccountId);
    if (balance < overageCostMinor) throw new InsufficientBalanceForCallError();
  }

  const billedFromBundle = await consumeBundleMinutes(userId, fromBundle);

  const { rows: sessionRows } = await query<{ id: string }>(
    `INSERT INTO call_sessions (user_id, provider, provider_call_sid, to_number, duration_seconds, cost_minor, billed_minutes_from_bundle, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING id`,
    [userId, adapter.id, result.providerCallSid, toNumber, durationSeconds, overageCostMinor, billedFromBundle]
  );
  const callSessionId = sessionRows[0].id;

  if (overageCostMinor > 0) {
    const walletAccountId = await getUserWalletAccount(userId, CURRENCY);
    const expenseAccountId = await getOrCreateAccount("platform", null, CURRENCY, "expense");
    await postJournal({
      description: `Voice call overage (${overageMinutes} min beyond free bundle)`,
      entries: [
        { accountId: walletAccountId, amountMinor: -overageCostMinor, currency: CURRENCY },
        { accountId: expenseAccountId, amountMinor: overageCostMinor, currency: CURRENCY },
      ],
    });
  }

  await logAudit(userId, "voice_call_placed", "call_session", callSessionId, {
    durationSeconds,
    billedFromBundle,
    overageCostMinor,
  });

  return { callSessionId, billedFromBundle, costMinor: overageCostMinor };
}
