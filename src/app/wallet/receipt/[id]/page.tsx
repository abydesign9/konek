import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { ShareReceiptButton } from "@/components/ShareReceiptButton";
import { findCountry } from "@/lib/intl/carriers";
import {
  formatDateTime,
  formatMoney,
  isCredit,
  txnTypeLabel,
  TXN_STATUS_CLASS,
  TXN_STATUS_LABEL,
} from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

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

// The `phone` and `network` fields carry different things per service type
// (a meter number, a smartcard, a bookmaker), so label them by transaction
// type rather than assuming "Phone"/"Network".
const SUBSCRIBER_LABEL: Record<string, string> = {
  electricity: "Meter number",
  cable: "Smartcard number",
  betting: "Account ID",
  intl_topup: "Recipient phone",
};
const PROVIDER_LABEL: Record<string, string> = {
  electricity: "Disco",
  cable: "Provider",
  betting: "Bookmaker",
  gift_card: "Brand",
  intl_topup: "Carrier",
};

function recipientLabel(key: string, type: string): string | null {
  switch (key) {
    case "phone":
      return SUBSCRIBER_LABEL[type] ?? "Phone";
    case "network":
      return PROVIDER_LABEL[type] ?? "Network";
    case "meterNo":
      return "Meter number";
    case "smartcardNo":
      return "Smartcard";
    case "country":
      return "Country";
    case "carrier":
      return "Carrier";
    case "displayCurrency":
      return "Charged in";
    case "bankName":
      return "Bank";
    case "accountName":
      return "Account name";
    case "accountNumberLast4":
      return "Account number";
    default:
      // Internal identifiers (e.g. bankAccountId, bankCode) stay hidden.
      return null;
  }
}

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

  // For intl top-up the network is stored as "<countryCode>:<carrierId>";
  // render it as a friendly "🇺🇸 AT&T" rather than the raw pair.
  function formatValue(key: string, value: unknown): string {
    if (key === "network" && txn.type === "intl_topup" && typeof value === "string" && value.includes(":")) {
      const [cc, carrierId] = value.split(":");
      const country = findCountry(cc);
      const carrier = country?.carriers.find((c) => c.id === carrierId)?.name ?? carrierId;
      return country ? `${country.flag} ${carrier}` : carrier;
    }
    if (key === "accountNumberLast4") return `••••${value}`;
    return String(value);
  }

  const credit = isCredit(txn.type);
  const recipientEntries: [string, string][] = txn.recipient
    ? Object.entries(txn.recipient)
        .map(([k, v]): [string | null, string] => [recipientLabel(k, txn.type), formatValue(k, v)])
        .filter((e): e is [string, string] => e[0] != null && e[1].length > 0)
    : [];

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Receipt"
        backHref="/wallet/history"
        backLabel="Transactions"
        right={
          <ShareReceiptButton
            title="Konek receipt"
            text={`${txnTypeLabel(txn.type)} · ${credit ? "+" : "−"}${formatMoney(txn.amount_minor, txn.currency)} · ${
              TXN_STATUS_LABEL[txn.status] ?? txn.status
            } · Konek`}
          />
        }
      />

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
          {recipientEntries.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
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
