import { query } from "@/lib/db";
import { getConfigValue, setConfigValue } from "@/lib/config/platformConfig";

// The Agent Program: affiliates, campus ambassadors and marketing partners refer
// customers and earn commission on those customers' purchases across the whole
// catalogue, plus perks (fee waivers, higher limits, priority). EVERYTHING here
// is admin-editable and can be switched off, so the team can tune or disable the
// programme without a code change.

const KEY = "agent_program";

export interface AgentProgram {
  enabled: boolean;             // master switch
  affiliateCommissionPct: number; // % the referring agent earns on a referred customer's purchase
  waiveCardCreationFee: boolean;  // agents pay no card creation fee
  feeDiscountPct: number;         // discount on fees agents pay (0-100)
  limitMultiplier: number;        // agents get this multiple of the normal transaction limits
  prioritySupport: boolean;       // agents are flagged for priority support routing
}

export const AGENT_PROGRAM_DEFAULTS: AgentProgram = {
  enabled: true,
  affiliateCommissionPct: 2,
  waiveCardCreationFee: false,
  feeDiscountPct: 0,
  limitMultiplier: 1,
  prioritySupport: true,
};

export async function getAgentProgram(): Promise<AgentProgram> {
  const stored = await getConfigValue<Partial<AgentProgram>>(KEY, {});
  return { ...AGENT_PROGRAM_DEFAULTS, ...stored };
}

export async function setAgentProgram(patch: Partial<AgentProgram>, adminUserId: string): Promise<AgentProgram> {
  const next = { ...(await getAgentProgram()), ...patch };
  await setConfigValue(KEY, next, adminUserId);
  return next;
}

// Is this user an active agent (any type)?
export async function isActiveAgent(userId: string): Promise<boolean> {
  const { rows } = await query<{ id: string }>(`SELECT id FROM agents WHERE user_id = $1 AND status = 'active'`, [userId]);
  return rows.length > 0;
}

// The card creation fee an agent actually pays after the programme's waiver /
// discount. Returns the original fee for non-agents or when the programme is off.
export async function agentAdjustedFeeMinor(userId: string, baseFeeMinor: number): Promise<number> {
  if (baseFeeMinor <= 0) return baseFeeMinor;
  try {
    const program = await getAgentProgram();
    if (!program.enabled) return baseFeeMinor;
    if (!(await isActiveAgent(userId))) return baseFeeMinor;
    if (program.waiveCardCreationFee) return 0;
    if (program.feeDiscountPct > 0) return Math.round(baseFeeMinor * (1 - program.feeDiscountPct / 100));
    return baseFeeMinor;
  } catch {
    // Never block issuance on a config-read hiccup — charge the base fee.
    return baseFeeMinor;
  }
}

// The limit multiplier applied for this user (1 for non-agents / programme off).
// Fails safe to 1 (base limits) so a config-read hiccup can never loosen limits.
export async function agentLimitMultiplier(userId: string): Promise<number> {
  try {
    const program = await getAgentProgram();
    if (!program.enabled || program.limitMultiplier === 1) return 1;
    return (await isActiveAgent(userId)) ? program.limitMultiplier : 1;
  } catch {
    return 1;
  }
}

// Affiliate commission: when a REFERRED customer buys anything, credit the agent
// who referred them. Idempotent per source transaction (unique index). Skips
// silently when the programme is off, the buyer has no referrer, or the referrer
// isn't an active agent. This is separate from the reseller commission an agent
// earns on their own sales (recordCommissionIfAgent).
export async function recordAffiliateCommission(
  purchaserUserId: string,
  txnId: string,
  amountMinor: number,
  currency: string
): Promise<void> {
  const program = await getAgentProgram();
  if (!program.enabled || program.affiliateCommissionPct <= 0) return;

  const { rows: refRows } = await query<{ referred_by: string | null }>(
    `SELECT referred_by FROM users WHERE id = $1`,
    [purchaserUserId]
  );
  const referrerUserId = refRows[0]?.referred_by;
  if (!referrerUserId || referrerUserId === purchaserUserId) return;

  const { rows: agentRows } = await query<{ id: string }>(
    `SELECT id FROM agents WHERE user_id = $1 AND status = 'active'`,
    [referrerUserId]
  );
  const agent = agentRows[0];
  if (!agent) return;

  const commissionMinor = Math.round((amountMinor * program.affiliateCommissionPct) / 100);
  if (commissionMinor <= 0) return;

  await query(
    `INSERT INTO agent_commissions (agent_id, source_txn_id, amount_minor, currency)
     VALUES ($1, $2, $3, $4) ON CONFLICT (source_txn_id) DO NOTHING`,
    [agent.id, txnId, commissionMinor, currency]
  );
}
