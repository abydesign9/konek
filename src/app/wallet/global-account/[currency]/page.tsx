import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { PageHeader } from "@/components/PageHeader";

export default async function GlobalAccountDetail({
  params,
}: {
  params: { currency: string };
}) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const currency = params.currency.toUpperCase();

  const { rows } = await query(
    `
    SELECT
      account_number,
      routing_number,
      bank_name,
      status
    FROM virtual_accounts
    WHERE user_id = $1
    AND currency = $2
    `,
    [userId, currency]
  );

  const account = rows[0];

  if (!account) {
    redirect("/wallet/dollar-account");
  }

  const balanceMinor = await getBalance(
    await getUserWalletAccount(userId, currency)
  );

  const symbol =
    currency === "USD"
      ? "$"
      : currency === "GBP"
      ? "£"
      : "€";

  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title={`${currency} Account`}
        backHref="/wallet/dollar-account"
      />

      <div className="max-w-lg mx-auto px-5 py-6">

        <div className="rounded-2xl bg-indigo text-white p-6 mb-6">

          <p className="text-xs text-white/60">
            {currency} Balance
          </p>

          <p className="text-3xl font-bold mt-2">
            {symbol}
            {(balanceMinor / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>

        </div>


        <div className="rounded-2xl bg-white border border-indigo/10 p-5 mb-6">

          <p className="font-heading font-bold text-indigo mb-4">
            Receive international payments
          </p>

          <p className="text-sm text-indigo/60 mb-4">
            Share these details with clients, employers and
            business partners to receive {currency} payments.
          </p>


          <p className="text-xs text-indigo/50">
            Account Number
          </p>

          <p className="font-mono text-sm mb-4">
            {account.account_number}
          </p>


          {account.routing_number && (
            <>
              <p className="text-xs text-indigo/50">
                Routing / Bank Code
              </p>

              <p className="font-mono text-sm mb-4">
                {account.routing_number}
              </p>
            </>
          )}


          <p className="text-xs text-indigo/50">
            Bank
          </p>

          <p className="text-sm">
            {account.bank_name}
          </p>

        </div>


        <button className="w-full rounded-xl bg-indigo text-white py-3 font-semibold mb-3">
          Withdraw to Bank Account
        </button>


        <div className="rounded-2xl bg-konek-green/10 border border-konek-green/30 p-5">

          <p className="font-bold text-indigo mb-2">
            Use your balance for
          </p>

          <p className="text-sm text-indigo/70">
            ✓ eSIM
            <br />
            ✓ Netflix and subscriptions
            <br />
            ✓ Online services
            <br />
            ✓ Business payments
          </p>

        </div>

      </div>

    </main>
  );
}
