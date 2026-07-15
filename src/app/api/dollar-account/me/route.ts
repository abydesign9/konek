import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: userRows } = await query<{ kyc_tier: number }>(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  const { rows: accountRows } = await query(
    `SELECT id, provider_ref, account_number, routing_number, bank_name, status FROM virtual_accounts WHERE user_id = $1`,
    [userId]
  );
  const account = accountRows[0];

  let inflows: unknown[] = [];
  let balanceMinor = 0;
  let ngnBalanceMinor = 0;
  if (account) {
    const { rows } = await query(
      `SELECT sender_name, sender_bank, amount_minor, status, received_at FROM virtual_account_inflows
       WHERE virtual_account_id = $1 ORDER BY received_at DESC LIMIT 20`,
      [account.id]
    );
    inflows = rows;
    balanceMinor = await getBalance(await getUserWalletAccount(userId, "USD"));
    ngnBalanceMinor = await getBalance(await getUserWalletAccount(userId, "NGN"));
  }

  return NextResponse.json({
    kycTier: userRows[0]?.kyc_tier ?? 0,
    account: account ?? null,
    balanceMinor,
    ngnBalanceMinor,
    inflows,
  });
}
