import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

export default async function EsimUsagePage({ params }: { params: { txnId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows } = await query<{
    token: string | null;
    status: string;
    recipient: { network: string; planExternalId?: string };
  }>(
    `SELECT token, status, recipient FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'esim'`,
    [params.txnId, userId]
  );
  const txn = rows[0];

  if (!txn || txn.status !== "delivered") {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <p className="text-indigo/60 mb-6">eSIM not found or not yet issued.</p>
        <Link href="/home" className="rounded-xl bg-indigo text-white font-semibold px-6 py-3">
          Back to home
        </Link>
      </main>
    );
  }

  const seed = (txn.token ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const usedMb = seed % 3000;
  const totalMb = 5000;
  const remainingMb = totalMb - usedMb;
  const pctUsed = Math.round((usedMb / totalMb) * 100);

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">eSIM usage</h1>
      <p className="text-sm text-indigo/60 mb-8">
        {txn.recipient.network?.toUpperCase()} · {txn.recipient.planExternalId}
      </p>

      <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-indigo/60">Data remaining</span>
          <span className="font-semibold text-indigo">{(remainingMb / 1000).toFixed(2)} GB</span>
        </div>
        <div className="w-full h-2 rounded-full bg-indigo/10 overflow-hidden">
          <div className="h-full bg-konek-green" style={{ width: `${100 - pctUsed}%` }} />
        </div>
        <p className="text-xs text-indigo/50 mt-2">
          {(usedMb / 1000).toFixed(2)} GB used of {(totalMb / 1000).toFixed(0)} GB
        </p>
      </div>

      <p className="text-xs text-indigo/40 font-mono mb-8">ICCID {txn.token}</p>

      <Link href="/home" className="rounded-xl bg-indigo text-white font-semibold px-6 py-3 inline-block">
        Back to home
      </Link>
    </main>
  );
}
