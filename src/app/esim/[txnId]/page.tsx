import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { QrCode } from "@/components/QrCode";
import { ShareReceiptButton } from "@/components/ShareReceiptButton";
import { esimLpaString } from "@/lib/esim";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

interface EsimTxn {
  token: string | null;
  status: string;
  recipient: { network?: string; planExternalId?: string } | null;
  plan_name: string | null;
  plan_meta: { place?: string; flag?: string; dataMb?: number; validityDays?: number } | null;
  created_at: string;
}

export default async function EsimUsagePage({ params }: { params: { txnId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows } = await query<EsimTxn>(
    `SELECT t.token, t.status, t.recipient, t.created_at, c.name AS plan_name, c.meta AS plan_meta
     FROM transactions t
     LEFT JOIN catalog_items c
       ON c.service_type = 'esim' AND c.external_id = t.recipient->>'planExternalId'
     WHERE t.id = $1 AND t.user_id = $2 AND t.type = 'esim'`,
    [params.txnId, userId]
  );
  const txn = rows[0];
  if (!txn) notFound();

  if (txn.status !== "delivered") {
    return (
      <main className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-center text-center">
        <p className="text-indigo/60 mb-6">eSIM not found or not yet issued.</p>
        <Link href="/esim" className="rounded-xl bg-indigo text-white font-semibold px-6 py-3">
          My eSIMs
        </Link>
      </main>
    );
  }

  // Deterministic mock usage (no live eSIM management API yet), scaled to the
  // plan's real data allowance from the catalog.
  const totalMb = txn.plan_meta?.dataMb ?? 5000;
  const seed = (txn.token ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const usedMb = Math.min(seed % totalMb, totalMb);
  const remainingMb = totalMb - usedMb;
  const pctRemaining = Math.round((remainingMb / totalMb) * 100);
  const place = txn.plan_meta?.place ?? txn.recipient?.network?.toUpperCase() ?? "eSIM";

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="eSIM"
        backHref="/esim"
        backLabel="My eSIMs"
        right={<ShareReceiptButton title="My Konek eSIM" text={`${place} eSIM · ${(totalMb / 1000).toFixed(0)}GB · Konek`} />}
      />

      <div className="max-w-lg mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{txn.plan_meta?.flag ?? "📶"}</span>
          <div>
            <h1 className="font-heading text-lg font-bold text-indigo">{place}</h1>
            <p className="text-sm text-indigo/60">{txn.plan_name ?? txn.recipient?.planExternalId}</p>
          </div>
        </div>

        {/* Usage meter */}
        <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-indigo/60">Data remaining</span>
            <span className="font-semibold text-indigo">{(remainingMb / 1000).toFixed(2)} GB</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-indigo/10 overflow-hidden">
            <div
              className={`h-full ${pctRemaining < 15 ? "bg-gold" : "bg-konek-green"}`}
              style={{ width: `${pctRemaining}%` }}
            />
          </div>
          <p className="text-xs text-indigo/50 mt-2">
            {(usedMb / 1000).toFixed(2)} GB used of {(totalMb / 1000).toFixed(0)} GB
            {txn.plan_meta?.validityDays ? ` · valid ${txn.plan_meta.validityDays} days` : ""}
          </p>
        </div>

        {/* Activation QR */}
        <div className="rounded-2xl border border-indigo/10 bg-white p-5 mb-4 flex flex-col items-center">
          <p className="text-sm font-semibold text-indigo mb-3 self-start">Activation QR</p>
          <QrCode value={esimLpaString(txn.token ?? "")} size={180} />
          <p className="font-mono text-xs text-indigo/50 mt-3 break-all text-center">ICCID {txn.token}</p>
          <p className="text-xs text-indigo/40 mt-1">Activated {formatDateTime(txn.created_at)}</p>
        </div>

        {/* Top-up */}
        <Link
          href="/buy/esim"
          className="block rounded-2xl border border-konek-green/30 bg-konek-green/5 px-5 py-4 text-center"
        >
          <p className="font-heading font-semibold text-indigo">Running low? Top up data</p>
          <p className="text-sm text-indigo/60">Add another pack for {place} in seconds →</p>
        </Link>
      </div>
    </main>
  );
}
