import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export default async function FundSuccessPage({
  searchParams,
}: {
  searchParams: { reference?: string };
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const reference = searchParams.reference;
  const { rows } = reference
    ? await query<{ status: string; amount_minor: string; currency: string }>(
        `SELECT status, amount_minor, currency FROM transactions WHERE id = $1 AND user_id = $2`,
        [reference, userId]
      )
    : { rows: [] };
  const txn = rows[0];

  const statusCopy: Record<string, string> = {
    delivered: "Wallet funded!",
    pending_vendor: "Still processing…",
    initiated: "Still processing…",
    failed: "Payment failed",
  };

  return (
    <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
      <h1 className="font-heading text-xl font-bold text-indigo mb-2">
        {txn ? statusCopy[txn.status] ?? txn.status : "Transaction not found"}
      </h1>
      {txn && (
        <p className="text-indigo/70 mb-8">
          ₦{(Number(txn.amount_minor) / 100).toLocaleString()} {txn.currency}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/home" className="rounded-xl bg-indigo text-white font-semibold px-6 py-3">
          Back to home
        </Link>
        {reference && txn && (
          <Link
            href={`/wallet/receipt/${reference}`}
            className="rounded-xl border border-indigo/20 bg-white text-indigo font-semibold px-6 py-3"
          >
            View receipt
          </Link>
        )}
      </div>
    </main>
  );
}
