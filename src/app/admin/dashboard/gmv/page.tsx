import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShell } from "@/components/AdminShell";
import { gmvByProduct, type Range } from "@/lib/admin/metrics";
import { txnTypeLabel } from "@/lib/format";
import { naira } from "../ui";

export const dynamic = "force-dynamic";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "mtd", label: "Month to date" },
];

// Drill-down level 1: GMV by product. Each row drills into the product's
// network/provider split.
export default async function GmvByProductPage({ searchParams }: { searchParams: { range?: string } }) {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const range: Range = (["today", "yesterday", "mtd"] as const).includes(searchParams.range as Range)
    ? (searchParams.range as Range)
    : "today";

  const slices = await gmvByProduct(range);
  const total = slices.reduce((s, p) => s + p.gmvMinor, 0);

  return (
    <AdminShell adminEmail={session.email}>
      <div className="px-6 py-6">
        <p className="mb-1 text-xs text-indigo/45">
          <Link href="/admin/dashboard" className="hover:underline">Executive</Link> / GMV
        </p>
        <h1 className="mb-1 font-heading text-2xl font-bold text-indigo">GMV by product</h1>
        <p className="mb-5 text-sm text-indigo/55">
          {naira(total)} across {slices.reduce((s, p) => s + p.txns, 0).toLocaleString()} delivered transactions
        </p>

        <div className="mb-6 flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/dashboard/gmv?range=${r.key}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                r.key === range ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {slices.length === 0 ? (
          <p className="text-sm text-indigo/50">No delivered transactions in this period.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {slices.map((p) => {
              const share = total ? p.gmvMinor / total : 0;
              return (
                <Link
                  key={p.product}
                  href={`/admin/dashboard/gmv/${p.product}?range=${range}`}
                  className="rounded-2xl border border-indigo/10 bg-white p-4 hover:border-indigo/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-indigo">{txnTypeLabel(p.product)}</p>
                    <p className="font-heading font-bold text-indigo">{naira(p.gmvMinor)}</p>
                  </div>
                  <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-indigo/10">
                    <div className="h-full rounded-full bg-konek-green" style={{ width: `${Math.max(share * 100, 2)}%` }} />
                  </div>
                  <p className="text-xs text-indigo/50">
                    {(share * 100).toFixed(1)}% of GMV · {p.txns.toLocaleString()} transactions →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
