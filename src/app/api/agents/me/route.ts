import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getBalance } from "@/lib/ledger/balance";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    tier: string;
    commission_rate: string;
    status: string;
    float_account_id: string;
  }>(`SELECT id, tier, commission_rate, status, float_account_id FROM agents WHERE user_id = $1`, [userId]);

  const agent = rows[0];
  if (!agent) return NextResponse.json({ agent: null });

  const { rows: commissionRows } = await query<{ paid: boolean; amount_minor: string }>(
    `SELECT paid, amount_minor FROM agent_commissions WHERE agent_id = $1`,
    [agent.id]
  );
  const unpaidMinor = commissionRows.filter((c) => !c.paid).reduce((sum, c) => sum + Number(c.amount_minor), 0);
  const paidMinor = commissionRows.filter((c) => c.paid).reduce((sum, c) => sum + Number(c.amount_minor), 0);
  const floatBalanceMinor = await getBalance(agent.float_account_id);

  return NextResponse.json({
    agent: {
      id: agent.id,
      tier: agent.tier,
      commissionRate: Number(agent.commission_rate),
      status: agent.status,
      unpaidMinor,
      paidMinor,
      floatBalanceMinor,
    },
  });
}
