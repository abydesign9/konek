import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { verifyPin } from "@/lib/auth/pin";
import { getBalance } from "@/lib/ledger/balance";

export class OutstandingBalanceError extends Error {
  constructor() {
    super("Withdraw or spend your wallet balance before closing your account");
    this.name = "OutstandingBalanceError";
  }
}

// Real closure, not a fake toggle: verifies the transaction PIN (same bar
// as authorizing a purchase — this is at least as consequential), refuses
// if either wallet still holds funds (a closed account can't be topped up
// or spent from, so a stranded balance would just be lost), sets
// users.status = 'closed', and revokes every session row for the user —
// including the one making this request, which is what actually locks
// them out immediately rather than relying on a status check elsewhere.
export async function closeAccount(userId: string, pin: string): Promise<void> {
  await verifyPin(userId, pin);

  const { rows: accounts } = await query<{ id: string; currency: string }>(
    `SELECT id, currency FROM ledger_accounts WHERE owner_type = 'user' AND owner_id = $1 AND kind = 'wallet'`,
    [userId]
  );
  for (const account of accounts) {
    const balance = await getBalance(account.id);
    if (balance > 0) throw new OutstandingBalanceError();
  }

  await query(`UPDATE users SET status = 'closed', updated_at = now() WHERE id = $1`, [userId]);
  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  await logAudit(userId, "account_closed", "user", userId);
}
