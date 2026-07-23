import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getKycStatus } from "@/lib/kyc/kycService";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";

// Drives the "Complete your setup" card + /setup checklist. Each step is a real
// thing the user benefits from finishing, with the page that completes it.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const [{ rows: userRows }, kyc, ngnAccountId, { rows: bankRows }, { rows: fundRows }] = await Promise.all([
    query<{ full_name: string | null; username: string | null; pin_hash: string | null }>(
      `SELECT full_name, username, pin_hash FROM users WHERE id = $1`,
      [userId]
    ),
    getKycStatus(userId),
    getUserWalletAccount(userId, "NGN"),
    query<{ n: string }>(`SELECT count(*) AS n FROM bank_accounts WHERE user_id = $1`, [userId]),
    query<{ n: string }>(
      `SELECT count(*) AS n FROM transactions WHERE user_id = $1 AND type = 'fund_wallet' AND status = 'delivered'`,
      [userId]
    ),
  ]);

  const u = userRows[0];
  const balance = await getBalance(ngnAccountId);
  const funded = Number(fundRows[0]?.n ?? 0) > 0 || balance > 0;

  const steps = [
    {
      key: "verify",
      label: "Verify your identity",
      description: "BVN or NIN — unlocks funding and purchases",
      done: kyc.bvnVerified || kyc.ninVerified || kyc.tier >= 1,
      href: "/kyc",
    },
    {
      key: "pin",
      label: "Set a transaction PIN",
      description: "Authorize purchases securely",
      done: !!u?.pin_hash,
      href: "/settings/pin",
    },
    {
      key: "profile",
      label: "Complete your profile",
      description: "Add your name and username",
      done: !!u?.full_name && !!u?.username,
      href: "/profile/account",
    },
    {
      key: "fund",
      label: "Fund your wallet",
      description: "Add money to start transacting",
      done: funded,
      href: "/wallet/fund",
    },
    {
      key: "payout",
      label: "Add a payout account",
      description: "Link the bank you'll withdraw to",
      done: Number(bankRows[0]?.n ?? 0) > 0,
      href: "/settings/payout",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const next = steps.find((s) => !s.done) ?? null;

  return NextResponse.json({ steps, pct, doneCount, total: steps.length, complete: pct >= 100, next });
}
