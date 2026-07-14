import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows: cards } = await query(
    `SELECT id, brand, last4, status, currency, created_at FROM cards WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const cardsWithTxns = [];
  for (const card of cards) {
    const { rows: txns } = await query(
      `SELECT id, merchant_name, amount_minor, status, decline_reason, three_ds_challenge, three_ds_passed, created_at
       FROM card_transactions WHERE card_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [card.id]
    );
    cardsWithTxns.push({ ...card, transactions: txns });
  }

  const walletAccountId = await getUserWalletAccount(userId, "USD");
  const balanceMinor = await getBalance(walletAccountId);

  return NextResponse.json({ cards: cardsWithTxns, balanceMinor });
}
