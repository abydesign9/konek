import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

interface EsimRow {
  id: string;
  status: string;
  token: string | null;
  recipient: { network?: string; planExternalId?: string } | null;
  plan_meta: { place?: string; flag?: string; dataMb?: number; validityDays?: number } | null;
  created_at: string;
}

export default async function MyEsimsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Join the catalog to recover the pack's place/flag/size, which aren't
  // stored on the transaction itself (only the plan's external id is).
  const { rows } = await query<EsimRow>(
    `SELECT t.id, t.status, t.token, t.recipient, t.created_at, c.meta AS plan_meta
     FROM transactions t
     LEFT JOIN catalog_items c
       ON c.service_type = 'esim' AND c.external_id = t.recipient->>'planExternalId'
     WHERE t.user_id = $1 AND t.type = 'esim' AND t.status = 'delivered'
     ORDER BY t.created_at DESC`,
    [userId]
  );

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="My eSIMs"
        backHref="/home"
        right={
          <Link href="/buy/esim" className="text-sm font-semibold text-konek-green hover:underline">
            Buy
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-6 py-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white border border-indigo/10 p-8 text-center">
            <p className="font-heading font-semibold text-indigo mb-1">No eSIMs yet</p>
            <p className="text-sm text-indigo/60 mb-4">Get connected the moment you land.</p>
            <Link
              href="/buy/esim"
              className="inline-block rounded-xl bg-indigo text-white font-semibold px-6 py-3"
            >
              Browse eSIM packs
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/esim/${e.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white border border-indigo/10 px-4 py-3.5 hover:border-indigo/25"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{e.plan_meta?.flag ?? "📶"}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-indigo truncate">
                        {e.plan_meta?.place ?? e.recipient?.network?.toUpperCase() ?? "eSIM"}
                      </span>
                      <span className="block text-xs text-indigo/50 truncate">
                        Activated {formatDateTime(e.created_at)}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-konek-green shrink-0 ml-3">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
