import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { gmvByNetwork, SPEND_TYPES, type Range } from "@/lib/admin/metrics";
import { txnTypeLabel } from "@/lib/format";
import { naira } from "../../ui";

export const dynamic = "force-dynamic";

// Drill-down level 2: one product's GMV split by network/provider
// (e.g. Airtime -> MTN / Airtel / Glo / 9mobile).
export default async function GmvByNetworkPage({
  params,
  searchParams,
}: {
  params: { product: string };
  searchParams: { range?: string };
}) {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const product = params.product;
  if (!(SPEND_TYPES as readonly string[]).includes(product)) redirect("/admin/dashboard/gmv");

  const range: Range = (["today", "yesterday", "mtd"] as const).includes(searchParams.range as Range)
    ? (searchParams.range as Range)
    : "today";

  const slices = await gmvByNetwork(product, range);
  const total = slices.reduce((s, n) => s + n.gmvMinor, 0);

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <p className="mb-1 text-xs text-indigo/45">
          <Link href="/admin/dashboard" className="hover:underline">Executive</Link> /{" "}
          <Link href={`/admin/dashboard/gmv?range=${range}`} className="hover:underline">GMV</Link> /{" "}
          {txnTypeLabel(product)}
        </p>
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">{txnTypeLabel(product)} by network</h1>
        <p className="mb-6 text-sm text-indigo/55">
          {naira(total)} · {slices.reduce((s, n) => s + n.txns, 0).toLocaleString()} transactions ({range})
        </p>

        {slices.length === 0 ? (
          <p className="text-sm text-indigo/50">No delivered {txnTypeLabel(product)} transactions in this period.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {slices.map((n) => {
              const share = total ? n.gmvMinor / total : 0;
              return (
                <div key={n.network} className="rounded-2xl border border-indigo/10 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold uppercase text-indigo">{n.network}</p>
                    <p className="font-heading font-bold text-indigo">{naira(n.gmvMinor)}</p>
                  </div>
                  <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-indigo/10">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(share * 100, 2)}%` }} />
                  </div>
                  <p className="text-xs text-indigo/50">
                    {(share * 100).toFixed(1)}% · {n.txns.toLocaleString()} transactions
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
