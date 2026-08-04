import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import {
  formatDateTime,
  formatMoney,
  isCredit,
  txnTypeLabel,
  TXN_STATUS_CLASS,
  TXN_STATUS_LABEL,
} from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

interface TxnRow {
  id: string;
  type: string;
  status: string;
  currency: string;
  amount_minor: string;
  recipient: { phone?: string; network?: string } | null;
  created_at: string;
}

const CURRENCIES = ["NGN", "USD"] as const;
type CurrencyFilter = (typeof CURRENCIES)[number];

function recipientLine(t: TxnRow): string | null {
  if (!t.recipient) return null;
  const bits = [t.recipient.network, t.recipient.phone].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { currency?: string };
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const currency: CurrencyFilter = CURRENCIES.includes(searchParams.currency as CurrencyFilter)
    ? (searchParams.currency as CurrencyFilter)
    : "NGN";

  const { rows } = await query<TxnRow>(
    `SELECT id, type, status, currency, amount_minor, recipient, created_at
     FROM transactions
     WHERE user_id = $1 AND currency = $2
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId, currency]
  );

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Transactions"
        backHref="/home"
        right={
          <a
            href={`/api/wallet/statement?currency=${currency}`}
            className="text-sm font-semibold text-konek-green hover:underline"
          >
            Export
          </a>
        }
      />

      <div className="max-w-lg mx-auto px-6 py-6">
        {/* Currency filter */}
        <div className="flex gap-2 mb-6">
          {CURRENCIES.map((c) => (
            <Link
              key={c}
              href={`/wallet/history?currency=${c}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                currency === c ? "bg-indigo text-white" : "bg-indigo/10 text-indigo/70"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white border border-indigo/10 p-8 text-center">
            <p className="font-heading font-semibold text-indigo mb-1">No transactions yet</p>
            <p className="text-sm text-indigo/60">
              Your {currency} transactions will show up here once you start using Konek.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((t) => {
              const credit = isCredit(t.type);
              const sub = recipientLine(t);
              return (
                <li key={t.id}>
                  <Link
                    href={`/wallet/receipt/${t.id}`}
                    className="flex items-center justify-between rounded-2xl bg-white border border-indigo/10 px-4 py-3.5 hover:border-indigo/25"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-indigo truncate">{txnTypeLabel(t.type)}</p>
                      <p className="text-xs text-indigo/50 truncate">
                        {sub ? `${sub} · ` : ""}
                        {formatDateTime(t.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`font-semibold ${credit ? "text-konek-green" : "text-indigo"}`}>
                        {credit ? "+" : "−"}
                        {formatMoney(t.amount_minor, t.currency)}
                      </p>
                      <span
                        className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          TXN_STATUS_CLASS[t.status] ?? "bg-indigo/10 text-indigo"
                        }`}
                      >
                        {TXN_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
