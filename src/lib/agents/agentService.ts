import { query, withTransaction } from "@/lib/db";
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

  // Idempotent per source transaction — a retried post-delivery hook must not
  // record the commission twice (backed by a unique index in migration 0031).
  await query(
    `INSERT INTO agent_commissions (agent_id, source_txn_id, amount_minor, currency)
     VALUES ($1, $2, $3, $4) ON CONFLICT (source_txn_id) DO NOTHING`,
    [agent.id, txnId, commissionMinor, currency]
  );
}

// Pays out every unpaid commission for an agent in one journal, crediting
// their float account from platform expense (a rebate is a cost to us).
export async function payAgentCommissions(agentId: string, adminActor: string): Promise<{ journalId: string | null; paidMinor: number }> {
  const { rows: agentRows } = await query<{ user_id: string }>(`SELECT user_id FROM agents WHERE id = $1`, [agentId]);
  const agentUserId = agentRows[0]?.user_id;
  if (!agentUserId) throw new Error("Agent not found");

  const result = await withTransaction(async (client) => {
    // Atomic claim: flip all unpaid commissions to paid and take them under a
    // row lock. A concurrent payout gets 0 rows back — so it can never double-pay.
    const claim = await client.query(
      `UPDATE agent_commissions SET paid = true WHERE agent_id = $1 AND paid = false
       RETURNING amount_minor, currency`,
      [agentId]
    );
    if (claim.rowCount === 0) return { journalId: null as string | null, paidMinor: 0, count: 0 };

    // Group by currency — an agent can earn both NGN and USD rebates, and each
    // currency must settle in its own balanced journal on its own float account.
    const byCurrency = new Map<string, number>();
    for (const r of claim.rows as { amount_minor: string; currency: string }[]) {
      byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + Number(r.amount_minor));
    }

    let journalId: string | null = null;
    let paidMinor = 0;
    for (const [currency, total] of byCurrency) {
      const floatAccountId = await getOrCreateAccount("user", agentUserId, currency, "agent_float");
      const expenseAccountId = await getOrCreateAccount("platform", null, currency, "expense");
      const posted = await postJournal(
        {
          journalType: "adjustment",
          description: `Agent commission payout (${currency})`,
          entries: [
            { accountId: expenseAccountId, amountMinor: -total, currency },
            { accountId: floatAccountId, amountMinor: total, currency },
          ],
        },
        client as never
      );
      journalId = posted.journalId;
      paidMinor += total;
    }
    return { journalId, paidMinor, count: claim.rowCount };
  });

  if (result.paidMinor > 0) {
    await logAudit(adminActor, "agent_commissions_paid", "agent", agentId, {
      paidMinor: result.paidMinor,
      journalId: result.journalId,
      count: result.count,
    });
  }
  return { journalId: result.journalId, paidMinor: result.paidMinor };
}
