import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { txnTypeLabel, TXN_STATUS_LABEL } from "@/lib/format";

interface StatementRow {
  id: string;
  type: string;
  status: string;
  currency: string;
  amount_minor: string;
  fee_minor: string;
  vendor: string | null;
  vendor_ref: string | null;
  created_at: string;
}

// Wrap a value for CSV: quote and escape embedded quotes so a vendor ref with
// a comma can't shift columns.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const currencyParam = req.nextUrl.searchParams.get("currency");
  const currency = currencyParam === "USD" ? "USD" : "NGN";

  const { rows } = await query<StatementRow>(
    `SELECT id, type, status, currency, amount_minor, fee_minor, vendor, vendor_ref, created_at
     FROM transactions
     WHERE user_id = $1 AND currency = $2
     ORDER BY created_at DESC
     LIMIT 5000`,
    [userId, currency]
  );

  const header = ["Date", "Type", "Status", "Currency", "Amount", "Fee", "Provider", "Reference", "Transaction ID"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toISOString(),
        txnTypeLabel(r.type),
        TXN_STATUS_LABEL[r.status] ?? r.status,
        r.currency,
        (Number(r.amount_minor) / 100).toFixed(2),
        (Number(r.fee_minor) / 100).toFixed(2),
        r.vendor ?? "",
        r.vendor_ref ?? "",
        r.id,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `konek-statement-${currency}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
