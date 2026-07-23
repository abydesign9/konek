import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getBalance } from "@/lib/ledger/balance";

// The agent's own dashboard payload: status/tier, float, commission totals,
// this month's performance, rank among all agents, and recent earnings.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    tier: string;
    commission_rate: string;
    status: string;
    float_account_id: string;
    created_at: string;
  }>(`SELECT id, tier, commission_rate, status, float_account_id, created_at FROM agents WHERE user_id = $1`, [userId]);

  const agent = rows[0];
  if (!agent) return NextResponse.json({ agent: null });

  const [{ rows: totals }, { rows: monthly }, { rows: rankRows }, { rows: recent }, floatBalanceMinor] =
    await Promise.all([
      query<{ unpaid: string; paid: string; lifetime_sales: string }>(
        `SELECT
           COALESCE(SUM(amount_minor) FILTER (WHERE NOT paid), 0) AS unpaid,
           COALESCE(SUM(amount_minor) FILTER (WHERE paid), 0) AS paid,
           COUNT(*) AS lifetime_sales
         FROM agent_commissions WHERE agent_id = $1`,
        [agent.id]
      ),
      query<{ sales: string; earned: string; volume: string }>(
        `SELECT COUNT(*) AS sales,
                COALESCE(SUM(c.amount_minor), 0) AS earned,
                COALESCE(SUM(t.amount_minor), 0) AS volume
         FROM agent_commissions c
         LEFT JOIN transactions t ON t.id = c.source_txn_id
         WHERE c.agent_id = $1 AND c.created_at >= date_trunc('month', now())`,
        [agent.id]
      ),
      query<{ rank: string | null; total: string }>(
        `WITH monthly AS (
           SELECT agent_id, SUM(amount_minor) AS earned
           FROM agent_commissions
           WHERE created_at >= date_trunc('month', now())
           GROUP BY agent_id
         ), ranked AS (
           SELECT agent_id, RANK() OVER (ORDER BY earned DESC) AS rank FROM monthly
         )
         SELECT (SELECT rank FROM ranked WHERE agent_id = $1) AS rank,
                (SELECT COUNT(*) FROM monthly) AS total`,
        [agent.id]
      ),
      query<{
        amount_minor: string;
        currency: string;
        paid: boolean;
        created_at: string;
        txn_type: string | null;
        txn_amount_minor: string | null;
      }>(
        `SELECT c.amount_minor, c.currency, c.paid, c.created_at,
                t.type AS txn_type, t.amount_minor AS txn_amount_minor
         FROM agent_commissions c
         LEFT JOIN transactions t ON t.id = c.source_txn_id
         WHERE c.agent_id = $1
         ORDER BY c.created_at DESC
         LIMIT 10`,
        [agent.id]
      ),
      getBalance(agent.float_account_id),
    ]);

  return NextResponse.json({
    agent: {
      id: agent.id,
      tier: agent.tier,
      commissionRate: Number(agent.commission_rate),
      status: agent.status,
      since: agent.created_at,
      floatBalanceMinor,
      unpaidMinor: Number(totals[0]?.unpaid ?? 0),
      paidMinor: Number(totals[0]?.paid ?? 0),
      lifetimeSales: Number(totals[0]?.lifetime_sales ?? 0),
      month: {
        sales: Number(monthly[0]?.sales ?? 0),
        earnedMinor: Number(monthly[0]?.earned ?? 0),
        volumeMinor: Number(monthly[0]?.volume ?? 0),
        rank: rankRows[0]?.rank ? Number(rankRows[0].rank) : null,
        totalAgents: Number(rankRows[0]?.total ?? 0),
      },
      recent: recent.map((r) => ({
        amountMinor: Number(r.amount_minor),
        currency: r.currency,
        paid: r.paid,
        createdAt: r.created_at,
        txnType: r.txn_type,
        txnAmountMinor: r.txn_amount_minor ? Number(r.txn_amount_minor) : null,
      })),
    },
  });
}
