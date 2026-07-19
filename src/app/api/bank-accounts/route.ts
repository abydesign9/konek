import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { encryptPii } from "@/lib/crypto/pii";
import { getPayoutProvider } from "@/lib/payout/provider";
import { findBank } from "@/lib/payout/banks";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    bank_code: string;
    bank_name: string;
    account_name: string;
    account_number_last4: string;
    verified: boolean;
  }>(
    `SELECT id, bank_code, bank_name, account_name, account_number_last4, verified
     FROM bank_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  // Never return the full account number — last4 only.
  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bankCode = body?.bankCode;
  const accountNumber = body?.accountNumber;

  const bank = typeof bankCode === "string" ? findBank(bankCode) : undefined;
  if (!bank) return NextResponse.json({ error: "Choose a valid bank" }, { status: 400 });
  if (typeof accountNumber !== "string" || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit account number" }, { status: 400 });
  }

  // Resolve the account name with the payout provider so the user confirms the
  // right destination before it can be used for a withdrawal.
  const resolved = await getPayoutProvider().resolveAccount(bank.code, accountNumber);
  if (!resolved) {
    return NextResponse.json({ error: "Could not verify that account. Check the number and bank." }, { status: 422 });
  }

  const last4 = accountNumber.slice(-4);
  const encrypted = JSON.stringify(encryptPii(accountNumber, `bank_account:${userId}`));

  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO bank_accounts (user_id, bank_code, bank_name, account_name, account_number_encrypted, account_number_last4, verified)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, true) RETURNING id`,
      [userId, bank.code, bank.name, resolved.accountName, encrypted, last4]
    );
    await logAudit(userId, "bank_account_added", "bank_account", rows[0].id, { bankCode: bank.code, last4 });
    return NextResponse.json({
      id: rows[0].id,
      bank_code: bank.code,
      bank_name: bank.name,
      account_name: resolved.accountName,
      account_number_last4: last4,
      verified: true,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "You've already added that account" }, { status: 409 });
    }
    throw err;
  }
}
