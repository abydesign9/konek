import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { query } from "@/lib/db";

// Real-time feed for the admin topnav bell — no polling of stale counts,
// each item is a live row from the table an admin would actually act on.
// Four sources today: open support tickets, unhealthy vendors, pending KYB
// applications, and open fraud-queue items. ("High value user" from the
// design spec has no backing concept in the schema yet, so it's left out
// rather than faked.)
interface OpsAlertItem {
  id: string;
  type: "ticket" | "provider" | "kyb" | "fraud";
  label: string;
  detail: string;
  href: string;
  created_at: string;
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [tickets, vendors, kyb, fraud] = await Promise.all([
    query<{ id: string; subject: string; priority: string; created_at: string }>(
      `SELECT id, subject, priority, created_at FROM support_messages WHERE status = 'open' ORDER BY created_at DESC LIMIT 5`
    ),
    query<{ id: string; last_health_check: string | null }>(
      `SELECT id, last_health_check FROM vendors WHERE healthy = false ORDER BY last_health_check DESC NULLS LAST LIMIT 5`
    ),
    query<{ id: string; legal_name: string; created_at: string }>(
      `SELECT id, legal_name, created_at FROM business_accounts WHERE kyb_status = 'pending' ORDER BY created_at DESC LIMIT 5`
    ),
    query<{ id: string; priority: string; flag: string; created_at: string }>(
      `SELECT id, priority, flag, created_at FROM fraud_queue WHERE status = 'open' ORDER BY created_at DESC LIMIT 5`
    ),
  ]);

  const items: OpsAlertItem[] = [
    ...tickets.rows.map((t) => ({
      id: t.id,
      type: "ticket" as const,
      label: "New ticket",
      detail: `${t.subject} · ${t.priority}`,
      href: "/admin/support",
      created_at: t.created_at,
    })),
    ...vendors.rows.map((v) => ({
      id: v.id,
      type: "provider" as const,
      label: "Provider down",
      detail: v.id,
      // No dedicated Provider Monitoring page yet — vendor health lives on
      // the dashboard's Overview tab until that page is built.
      href: "/admin",
      created_at: v.last_health_check ?? new Date(0).toISOString(),
    })),
    ...kyb.rows.map((b) => ({
      id: b.id,
      type: "kyb" as const,
      label: "Business signup",
      detail: b.legal_name,
      href: "/admin",
      created_at: b.created_at,
    })),
    ...fraud.rows.map((f) => ({
      id: f.id,
      type: "fraud" as const,
      label: "Fraud queue",
      detail: `${f.flag} · ${f.priority}`,
      href: "/admin",
      created_at: f.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    total: tickets.rows.length + vendors.rows.length + kyb.rows.length + fraud.rows.length,
    items: items.slice(0, 8),
  });
}
