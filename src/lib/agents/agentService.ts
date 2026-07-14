import { query } from "@/lib/db";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount } from "@/lib/ledger/accounts";
import { logAudit } from "@/lib/audit";

export class AlreadyAnAgentError extends Error {
  constructor() {
    super("This account already has an agent application");
    this.name = "AlreadyAnAgentError";
  }
}

export async function applyAsAgent(userId: string): Promise<{ agentId: string }> {
  const { rows: existing } = await query<{ id: string }>(`SELECT id FROM agents WHERE user_id = $1`, [userId]);
  if (existing[0]) throw new AlreadyAnAgentError();

  const floatAccountId = await getOrCreateAccount("user", userId, "NGN", "agent_float");

  const { rows } = await query<{ id: string }>(
    `INSERT INTO agents (user_id, float_account_id) VALUES ($1, $2) RETURNING id`,
    [userId, floatAccountId]
  );
  await logAudit(userId, "agent_apply", "agent", rows[0].id);
  return { agentId: rows[0].id };
}

export async function approveAgent(agentId: string, adminActor: string): Promise<void> {
  await query(`UPDATE agents SET status = 'active', approved_at = now() WHERE id = $1`, [agentId]);
  await logAudit(adminActor, "agent_approved", "agent", agentId);
}

// Called after a delivered purchase — if the buyer is an active agent, they
// earn a volume rebate on that sale, tracked (not yet paid) until an admin
// runs payCommissions.
export async function recordCommissionIfAgent(
  userId: string,
  txnId: string,
  amountMinor: number,
  currency: string
): Promise<void> {
  const { rows } = await query<{ id: string; commission_rate: string; status: string }>(
    `SELECT id, commission_rate, status FROM agents WHERE user_id = $1`,
    [userId]
  );
  const agent = rows[0];
  if (!agent || agent.status !== "active") return;

  const commissionMinor = Math.round(amountMinor * Number(agent.commission_rate));
  if (commissionMinor <= 0) return;

  await query(
    `INSERT INTO agent_commissions (agent_id, source_txn_id, amount_minor, currency) VALUES ($1, $2, $3, $4)`,
    [agent.id, txnId, commissionMinor, currency]
  );
}

// Pays out every unpaid commission for an agent in one journal, crediting
// their float account from platform expense (a rebate is a cost to us).
export async function payAgentCommissions(agentId: string, adminActor: string): Promise<{ journalId: string | null; paidMinor: number }> {
  const { rows: agentRows } = await query<{ float_account_id: string }>(
    `SELECT float_account_id FROM agents WHERE id = $1`,
    [agentId]
  );
  const floatAccountId = agentRows[0]?.float_account_id;
  if (!floatAccountId) throw new Error("Agent has no float account");

  const { rows: unpaid } = await query<{ id: string; amount_minor: string; currency: string }>(
    `SELECT id, amount_minor, currency FROM agent_commissions WHERE agent_id = $1 AND paid = false`,
    [agentId]
  );
  if (unpaid.length === 0) return { journalId: null, paidMinor: 0 };

  const currency = unpaid[0].currency;
  const totalMinor = unpaid.reduce((sum, c) => sum + Number(c.amount_minor), 0);
  const expenseAccountId = await getOrCreateAccount("platform", null, currency, "expense");

  const { journalId } = await postJournal({
    description: `Agent commission payout (${unpaid.length} sales)`,
    entries: [
      { accountId: expenseAccountId, amountMinor: -totalMinor, currency },
      { accountId: floatAccountId, amountMinor: totalMinor, currency },
    ],
  });

  await query(`UPDATE agent_commissions SET paid = true WHERE agent_id = $1 AND paid = false`, [agentId]);
  await logAudit(adminActor, "agent_commissions_paid", "agent", agentId, { totalMinor, journalId, count: unpaid.length });

  return { journalId, paidMinor: totalMinor };
}
