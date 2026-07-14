import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

interface Txn {
  id: string;
  type: string;
  status: string;
  currency: string;
  amount_minor: string;
  fee_minor: string;
  recipient: Record<string, unknown> | null;
  vendor: string | null;
  vendor_ref: string | null;
  token: string | null;
  failure_reason: string | null;
  created_at: string;
}

interface Event {
  to_status: string;
  created_at: string;
}

const RECIPIENT_LABELS: Record<string, string> = {
  phone: "Phone",
  network: "Network",
  meterNo: "Meter number",
  smartcardNo: "Smartcard",
  country: "Country",
  carrier: "Carrier",
  displayCurrency: "Charged in",
};

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-indigo/5 last:border-0">
      <span className="text-sm text-indigo/50">{label}</span>
      <span className={`text-sm text-indigo text-right ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { rows } = await query<Txn>(
    `SELECT id, type, status, currency, amount_minor, fee_minor, recipient, vendor, vendor_ref,
            token, failure_reason, created_at
     FROM transactions WHERE id = $1 AND user_id = $2`,
    [params.id, userId]
  );
  const txn = rows[0];
  if (!txn) notFound();

  const { rows: events } = await query<Event>(
    `SELECT to_status, created_at FROM transaction_events WHERE txn_id = $1 ORDER BY id ASC`,
    [txn.id]
  );

  const credit = isCredit(txn.type);
  const recipientEntries = txn.recipient
    ? Object.entries(txn.recipient).filter(
        ([k, v]) => RECIPIENT_LABELS[k] && v != null && k !== "displayAmountMinor"
      )
    : [];

  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-indigo/10">
        <div className="max-w-lg mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/wallet/history" className="text-sm text-indigo/60 hover:text-indigo">
            ← Transactions
          </Link>
          <span className="font-heading font-bold text-indigo">Receipt</span>
          <span className="w-16" />
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Amount header */}
        <div className="rounded-3xl bg-white border border-indigo/10 p-6 text-center mb-5">
          <p className="text-sm text-indigo/50 mb-1">{txnTypeLabel(txn.type)}</p>
          <p className={`font-heading text-3xl font-bold mb-3 ${credit ? "text-konek-green" : "text-indigo"}`}>
            {credit ? "+" : "−"}
            {formatMoney(txn.amount_minor, txn.currency)}
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              TXN_STATUS_CLASS[txn.status] ?? "bg-indigo/10 text-indigo"
            }`}
          >
            {TXN_STATUS_LABEL[txn.status] ?? txn.status}
          </span>
          {txn.status === "failed" && txn.failure_reason && (
            <p className="text-sm text-red-600 mt-3">{txn.failure_reason.replace(/_/g, " ")}</p>
          )}
        </div>

        {/* Delivered token (electricity units / exam pin) */}
        {txn.token && (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4 mb-5 text-center">
            <p className="text-xs text-indigo/60 mb-1">Your token / pin</p>
            <p className="font-mono font-bold text-lg text-indigo tracking-wider break-all">{txn.token}</p>
          </div>
        )}

        {/* Details */}
        <div className="rounded-2xl bg-white border border-indigo/10 px-5 py-2 mb-5">
          {recipientEntries.map(([k, v]) => (
            <DetailRow key={k} label={RECIPIENT_LABELS[k]} value={String(v)} />
          ))}
          {Number(txn.fee_minor) > 0 && (
            <DetailRow label="Fee" value={formatMoney(txn.fee_minor, txn.currency)} />
          )}
          {txn.vendor && <DetailRow label="Provider" value={txn.vendor} />}
          {txn.vendor_ref && <DetailRow label="Reference" value={txn.vendor_ref} mono />}
          <DetailRow label="Transaction ID" value={txn.id} mono />
          <DetailRow label="Date" value={formatDateTime(txn.created_at)} />
        </div>

        {/* Status timeline */}
        {events.length > 0 && (
          <div className="rounded-2xl bg-white border border-indigo/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo/40 mb-3">Timeline</p>
            <ol className="flex flex-col gap-3">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      e.to_status === "delivered"
                        ? "bg-konek-green"
                        : e.to_status === "failed"
                        ? "bg-red-500"
                        : "bg-indigo/30"
                    }`}
                  />
                  <span className="text-sm text-indigo flex-1">
                    {TXN_STATUS_LABEL[e.to_status] ?? e.to_status}
                  </span>
                  <span className="text-xs text-indigo/40">{formatDateTime(e.created_at)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="text-center text-xs text-indigo/40 mt-8">
          Konek · support@konek.app · Keep this receipt for your records
        </p>
      </div>
    </main>
  );
}
