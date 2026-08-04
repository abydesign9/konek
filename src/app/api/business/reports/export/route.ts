import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { requireVerifiedBusiness } from "@/lib/business/teamService";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV export of every distribution line item — the M9 "Export CSV" report.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const gate = await requireVerifiedBusiness(userId);
  if (!gate.ok && gate.code !== "no_business") return NextResponse.json({ error: gate.error, code: gate.code }, { status: gate.status });
  if (!gate.ok) return NextResponse.json({ error: "no business account" }, { status: 404 });
  const membership = gate.membership;

  const { rows } = await query<{
    created_at: string;
    purpose: string;
    service_type: string | null;
    network: string | null;
    phone: string | null;
    amount_minor: string | null;
    status: string;
    error: string | null;
  }>(
    `SELECT b.created_at, b.purpose,
            i.recipient->>'serviceType' AS service_type,
            i.recipient->>'network' AS network,
            i.recipient->>'phone' AS phone,
            i.recipient->>'amountMinor' AS amount_minor,
            i.status, i.error
     FROM bulk_batch_items i
     JOIN bulk_batches b ON b.id = i.batch_id
     WHERE b.business_account_id = $1
     ORDER BY b.created_at DESC
     LIMIT 10000`,
    [membership.businessAccountId]
  );

  const lines = ["Date,Purpose,Service,Network,Recipient,Amount NGN,Status,Error"];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toISOString(),
        r.purpose,
        r.service_type ?? "",
        r.network ?? "",
        r.phone ?? "",
        r.amount_minor ? (Number(r.amount_minor) / 100).toFixed(2) : "",
        r.status,
        r.error ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const filename = `konek-business-distributions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
