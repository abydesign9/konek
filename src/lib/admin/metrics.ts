import { query } from "@/lib/db";
import { getProviderMetricsSummary, type ProviderMetricsSummary } from "@/lib/vendors/providerMetrics";
import { getSupportStats, type SupportStats } from "@/lib/support/supportService";

// Read-only aggregations behind the layered admin dashboards. Everything is
// derived from the ledger/transactions/users tables — no cached counters to
// drift. "GMV" here = delivered spend volume; true net revenue needs provider
// cost feeds, which arrive with the real vendor adapters.

export const SPEND_TYPES = [
  "airtime",
  "data",
  "cable",
  "electricity",
  "exam_pin",
  "betting",
  "gift_card",
  "intl_topup",
  "intl_data",
  "esim",
] as const;

export type Range = "today" | "yesterday" | "mtd";

// now()-relative window bounds per range, as SQL fragments bound by params.
function rangeBounds(range: Range): { from: string; to: string } {
  switch (range) {
    case "today":
      return { from: "date_trunc('day', now())", to: "now()" };
    case "yesterday":
      return { from: "date_trunc('day', now()) - interval '1 day'", to: "date_trunc('day', now())" };
    case "mtd":
      return { from: "date_trunc('month', now())", to: "now()" };
  }
}

async function gmvBetween(fromSql: string, toSql: string): Promise<number> {
  const { rows } = await query<{ gmv: string | null }>(
    `SELECT SUM(amount_minor) AS gmv FROM transactions
     WHERE status = 'delivered' AND currency = 'NGN' AND type = ANY($1::text[])
       AND created_at >= ${fromSql} AND created_at < ${toSql}`,
    [SPEND_TYPES as unknown as string[]]
  );
  return Number(rows[0]?.gmv ?? 0);
}

export interface ProductSlice {
  product: string;
  gmvMinor: number;
  txns: number;
}

export async function gmvByProduct(range: Range): Promise<ProductSlice[]> {
  const b = rangeBounds(range);
  const { rows } = await query<{ type: string; gmv: string; txns: string }>(
    `SELECT type, SUM(amount_minor) AS gmv, COUNT(*) AS txns FROM transactions
     WHERE status = 'delivered' AND currency = 'NGN' AND type = ANY($1::text[])
       AND created_at >= ${b.from} AND created_at < ${b.to}
     GROUP BY type ORDER BY gmv DESC`,
    [SPEND_TYPES as unknown as string[]]
  );
  return rows.map((r) => ({ product: r.type, gmvMinor: Number(r.gmv), txns: Number(r.txns) }));
}

export interface NetworkSlice {
  network: string;
  gmvMinor: number;
  txns: number;
}

export async function gmvByNetwork(product: string, range: Range): Promise<NetworkSlice[]> {
  const b = rangeBounds(range);
  const { rows } = await query<{ network: string | null; gmv: string; txns: string }>(
    `SELECT recipient->>'network' AS network, SUM(amount_minor) AS gmv, COUNT(*) AS txns
     FROM transactions
     WHERE status = 'delivered' AND currency = 'NGN' AND type = $1
       AND created_at >= ${b.from} AND created_at < ${b.to}
     GROUP BY 1 ORDER BY gmv DESC`,
    [product]
  );
  return rows.map((r) => ({ network: r.network ?? "unknown", gmvMinor: Number(r.gmv), txns: Number(r.txns) }));
}

export interface ExecutiveMetrics {
  gmvTodayMinor: number;
  gmvYesterdayMinor: number;
  gmvMtdMinor: number;
  revenueByProduct: ProductSlice[]; // MTD
  customers: {
    signupsToday: number;
    activeToday: number;
    active30d: number;
    returning30d: number;
    newBusinessesMtd: number;
    newAgentsMtd: number;
    kycCompletionRate: number; // 0..1
    referralConversionRate: number; // 0..1
  };
  txns: {
    todayTotal: number;
    todayDelivered: number;
    todayFailed: number;
    todayPending: number;
    avgValueTodayMinor: number;
  };
  providers: ProviderMetricsSummary[];
  ops: {
    supportOpen: number;
    fraudOpen: number;
    kycPending: number;
    businessPending: number;
    pendingTxns: number;
  };
}

export async function executiveMetrics(): Promise<ExecutiveMetrics> {
  const [
    gmvToday,
    gmvYesterday,
    gmvMtd,
    revenueByProduct,
    customerRows,
    txnRows,
    providers,
    support,
    opsRows,
  ] = await Promise.all([
    gmvBetween("date_trunc('day', now())", "now()"),
    gmvBetween("date_trunc('day', now()) - interval '1 day'", "date_trunc('day', now())"),
    gmvBetween("date_trunc('month', now())", "now()"),
    gmvByProduct("mtd"),
    query<{
      signups_today: string;
      active_today: string;
      active_30d: string;
      returning_30d: string;
      new_businesses_mtd: string;
      new_agents_mtd: string;
      users_total: string;
      users_kyc: string;
      referred_total: string;
      referred_converted: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('day', now())) AS signups_today,
        (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE created_at >= date_trunc('day', now())) AS active_today,
        (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE created_at >= now() - interval '30 days') AS active_30d,
        (SELECT COUNT(*) FROM (
           SELECT user_id FROM transactions WHERE status = 'delivered'
           GROUP BY user_id
           HAVING COUNT(*) > 1 AND MAX(created_at) >= now() - interval '30 days'
         ) r) AS returning_30d,
        (SELECT COUNT(*) FROM business_accounts WHERE created_at >= date_trunc('month', now())) AS new_businesses_mtd,
        (SELECT COUNT(*) FROM agents WHERE created_at >= date_trunc('month', now())) AS new_agents_mtd,
        (SELECT COUNT(*) FROM users) AS users_total,
        (SELECT COUNT(*) FROM users WHERE kyc_tier >= 1) AS users_kyc,
        (SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL) AS referred_total,
        (SELECT COUNT(DISTINCT u.id) FROM users u
          JOIN transactions t ON t.user_id = u.id AND t.status = 'delivered'
          WHERE u.referred_by IS NOT NULL) AS referred_converted`
    ),
    query<{ total: string; delivered: string; failed: string; pending: string; avg_value: string | null }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed,
              COUNT(*) FILTER (WHERE status IN ('initiated','pending_vendor')) AS pending,
              AVG(amount_minor) FILTER (WHERE status = 'delivered' AND currency = 'NGN') AS avg_value
       FROM transactions WHERE created_at >= date_trunc('day', now())`
    ),
    getProviderMetricsSummary(60),
    getSupportStats(),
    query<{ fraud_open: string; kyc_pending: string; business_pending: string; pending_txns: string }>(
      `SELECT
        (SELECT COUNT(*) FROM fraud_queue WHERE status IN ('open','in_review')) AS fraud_open,
        (SELECT COUNT(*) FROM users WHERE kyc_status = 'pending') AS kyc_pending,
        (SELECT COUNT(*) FROM business_accounts WHERE kyb_status = 'pending') AS business_pending,
        (SELECT COUNT(*) FROM transactions WHERE status IN ('initiated','pending_vendor')
           AND created_at < now() - interval '10 minutes') AS pending_txns`
    ),
  ]);

  const c = customerRows.rows[0];
  const t = txnRows.rows[0];
  const o = opsRows.rows[0];
  const usersTotal = Number(c?.users_total ?? 0);
  const referredTotal = Number(c?.referred_total ?? 0);

  return {
    gmvTodayMinor: gmvToday,
    gmvYesterdayMinor: gmvYesterday,
    gmvMtdMinor: gmvMtd,
    revenueByProduct,
    customers: {
      signupsToday: Number(c?.signups_today ?? 0),
      activeToday: Number(c?.active_today ?? 0),
      active30d: Number(c?.active_30d ?? 0),
      returning30d: Number(c?.returning_30d ?? 0),
      newBusinessesMtd: Number(c?.new_businesses_mtd ?? 0),
      newAgentsMtd: Number(c?.new_agents_mtd ?? 0),
      kycCompletionRate: usersTotal ? Number(c?.users_kyc ?? 0) / usersTotal : 0,
      referralConversionRate: referredTotal ? Number(c?.referred_converted ?? 0) / referredTotal : 0,
    },
    txns: {
      todayTotal: Number(t?.total ?? 0),
      todayDelivered: Number(t?.delivered ?? 0),
      todayFailed: Number(t?.failed ?? 0),
      todayPending: Number(t?.pending ?? 0),
      avgValueTodayMinor: Math.round(Number(t?.avg_value ?? 0)),
    },
    providers,
    ops: {
      supportOpen: support.open + support.assigned,
      fraudOpen: Number(o?.fraud_open ?? 0),
      kycPending: Number(o?.kyc_pending ?? 0),
      businessPending: Number(o?.business_pending ?? 0),
      pendingTxns: Number(o?.pending_txns ?? 0),
    },
  };
}

// ---------------- Finance ----------------

export interface FinanceMetrics {
  walletLiabilities: { currency: string; totalMinor: number; wallets: number }[];
  reservationsHeldMinor: number;
  reservationsHeld: number;
  refundsMtd: { count: number; totalMinor: number };
  fxConversionsMtd: { count: number; usdMinor: number };
  withdrawalsMtd: { count: number; totalMinor: number };
  fundingMtd: { count: number; totalMinor: number };
}

export async function financeMetrics(): Promise<FinanceMetrics> {
  const [liab, resv, refunds, fx, withdrawals, funding] = await Promise.all([
    query<{ currency: string; total: string; wallets: string }>(
      `SELECT la.currency, SUM(ab.balance_minor) AS total, COUNT(*) AS wallets
       FROM account_balances ab
       JOIN ledger_accounts la ON la.id = ab.account_id
       WHERE la.owner_type = 'user' AND la.kind = 'wallet'
       GROUP BY la.currency`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(amount_minor) AS total FROM reservations WHERE status = 'held'`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(amount_minor) AS total FROM transactions
       WHERE type = 'refund' AND created_at >= date_trunc('month', now())`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(amount_minor) AS total FROM transactions
       WHERE type = 'fx_convert' AND status = 'delivered' AND created_at >= date_trunc('month', now())`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(amount_minor) AS total FROM transactions
       WHERE type = 'withdrawal' AND status = 'delivered' AND created_at >= date_trunc('month', now())`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(amount_minor) AS total FROM transactions
       WHERE type = 'fund_wallet' AND status = 'delivered' AND created_at >= date_trunc('month', now())`
    ),
  ]);

  return {
    walletLiabilities: liab.rows.map((r) => ({
      currency: r.currency,
      totalMinor: Number(r.total),
      wallets: Number(r.wallets),
    })),
    reservationsHeldMinor: Number(resv.rows[0]?.total ?? 0),
    reservationsHeld: Number(resv.rows[0]?.count ?? 0),
    refundsMtd: { count: Number(refunds.rows[0]?.count ?? 0), totalMinor: Number(refunds.rows[0]?.total ?? 0) },
    fxConversionsMtd: { count: Number(fx.rows[0]?.count ?? 0), usdMinor: Number(fx.rows[0]?.total ?? 0) },
    withdrawalsMtd: { count: Number(withdrawals.rows[0]?.count ?? 0), totalMinor: Number(withdrawals.rows[0]?.total ?? 0) },
    fundingMtd: { count: Number(funding.rows[0]?.count ?? 0), totalMinor: Number(funding.rows[0]?.total ?? 0) },
  };
}

// ---------------- Growth ----------------

export interface GrowthMetrics {
  signupsByDay: { day: string; signups: number }[]; // last 7 days
  referralConversionRate: number;
  referredTotal: number;
  firstTxnToday: number;
  repeatRate30d: number; // active users with >1 delivered txn / active users
  countryDistribution: { country: string; users: number }[];
}

export async function growthMetrics(): Promise<GrowthMetrics> {
  const [signups, referral, firstTxn, repeat, countries] = await Promise.all([
    query<{ day: string; signups: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS signups
       FROM users WHERE created_at >= now() - interval '7 days'
       GROUP BY 1 ORDER BY 1`
    ),
    query<{ referred: string; converted: string }>(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL) AS referred,
        (SELECT COUNT(DISTINCT u.id) FROM users u
          JOIN transactions t ON t.user_id = u.id AND t.status = 'delivered'
          WHERE u.referred_by IS NOT NULL) AS converted`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT user_id, MIN(created_at) AS first_txn FROM transactions WHERE status = 'delivered'
         GROUP BY user_id
       ) f WHERE f.first_txn >= date_trunc('day', now())`
    ),
    query<{ active: string; repeat: string }>(
      `SELECT COUNT(*) AS active, COUNT(*) FILTER (WHERE cnt > 1) AS repeat FROM (
         SELECT user_id, COUNT(*) AS cnt FROM transactions
         WHERE status = 'delivered' AND created_at >= now() - interval '30 days'
         GROUP BY user_id
       ) a`
    ),
    query<{ country: string; users: string }>(
      `SELECT country_code AS country, COUNT(*) AS users FROM users GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
    ),
  ]);

  const referred = Number(referral.rows[0]?.referred ?? 0);
  const active = Number(repeat.rows[0]?.active ?? 0);

  return {
    signupsByDay: signups.rows.map((r) => ({ day: r.day, signups: Number(r.signups) })),
    referralConversionRate: referred ? Number(referral.rows[0]?.converted ?? 0) / referred : 0,
    referredTotal: referred,
    firstTxnToday: Number(firstTxn.rows[0]?.count ?? 0),
    repeatRate30d: active ? Number(repeat.rows[0]?.repeat ?? 0) / active : 0,
    countryDistribution: countries.rows.map((r) => ({ country: r.country, users: Number(r.users) })),
  };
}

// ---------------- Business ----------------

export interface BusinessMetrics {
  byStatus: Record<string, number>;
  newMtd: number;
  bulkVolumeMtdMinor: number;
  bulkBatchesMtd: number;
  employeesServed: number;
  topBusinesses: { legalName: string; volumeMinor: number }[];
}

export async function businessMetrics(): Promise<BusinessMetrics> {
  const [status, bulk, employees, top] = await Promise.all([
    query<{ kyb_status: string; count: string; new_mtd: string }>(
      `SELECT kyb_status, COUNT(*) AS count,
              COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS new_mtd
       FROM business_accounts GROUP BY kyb_status`
    ),
    query<{ count: string; total: string | null }>(
      `SELECT COUNT(*) AS count, SUM(total_amount_minor) AS total FROM bulk_batches
       WHERE created_at >= date_trunc('month', now())`
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM business_employees`),
    query<{ legal_name: string; volume: string }>(
      `SELECT b.legal_name, SUM(bb.total_amount_minor) AS volume
       FROM bulk_batches bb JOIN business_accounts b ON b.id = bb.business_account_id
       WHERE bb.created_at >= date_trunc('month', now())
       GROUP BY b.legal_name ORDER BY volume DESC LIMIT 5`
    ),
  ]);

  const byStatus: Record<string, number> = {};
  let newMtd = 0;
  for (const r of status.rows) {
    byStatus[r.kyb_status] = Number(r.count);
    newMtd += Number(r.new_mtd);
  }

  return {
    byStatus,
    newMtd,
    bulkVolumeMtdMinor: Number(bulk.rows[0]?.total ?? 0),
    bulkBatchesMtd: Number(bulk.rows[0]?.count ?? 0),
    employeesServed: Number(employees.rows[0]?.count ?? 0),
    topBusinesses: top.rows.map((r) => ({ legalName: r.legal_name, volumeMinor: Number(r.volume) })),
  };
}

// ---------------- Agents ----------------

export interface AgentMetrics {
  byStatus: Record<string, number>;
  unpaidCommissionsMinor: number;
  commissionsMtdMinor: number;
  floatTotalMinor: number;
  topAgents: { phone: string | null; email: string | null; earnedMinor: number; sales: number }[];
}

export async function agentMetrics(): Promise<AgentMetrics> {
  const [status, commissions, float, top] = await Promise.all([
    query<{ status: string; count: string }>(`SELECT status, COUNT(*) AS count FROM agents GROUP BY status`),
    query<{ unpaid: string; mtd: string }>(
      `SELECT COALESCE(SUM(amount_minor) FILTER (WHERE NOT paid), 0) AS unpaid,
              COALESCE(SUM(amount_minor) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS mtd
       FROM agent_commissions`
    ),
    query<{ total: string | null }>(
      `SELECT SUM(ab.balance_minor) AS total FROM account_balances ab
       JOIN ledger_accounts la ON la.id = ab.account_id
       WHERE la.kind = 'agent_float'`
    ),
    query<{ phone: string | null; email: string | null; earned: string; sales: string }>(
      `SELECT u.phone, u.email, SUM(c.amount_minor) AS earned, COUNT(*) AS sales
       FROM agent_commissions c
       JOIN agents a ON a.id = c.agent_id
       JOIN users u ON u.id = a.user_id
       WHERE c.created_at >= date_trunc('month', now())
       GROUP BY u.phone, u.email ORDER BY earned DESC LIMIT 5`
    ),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of status.rows) byStatus[r.status] = Number(r.count);

  return {
    byStatus,
    unpaidCommissionsMinor: Number(commissions.rows[0]?.unpaid ?? 0),
    commissionsMtdMinor: Number(commissions.rows[0]?.mtd ?? 0),
    floatTotalMinor: Number(float.rows[0]?.total ?? 0),
    topAgents: top.rows.map((r) => ({
      phone: r.phone,
      email: r.email,
      earnedMinor: Number(r.earned),
      sales: Number(r.sales),
    })),
  };
}

// ---------------- Ops ----------------

export interface OpsMetrics {
  providers: ProviderMetricsSummary[];
  pendingTxns: { id: string; type: string; status: string; amount_minor: string; created_at: string }[];
  reservationsHeld: number;
  fraudOpen: number;
  kycPending: number;
  businessPending: number;
  agentsPending: number;
  support: SupportStats;
  webhookFailures24h: number;
}

export async function opsMetrics(): Promise<OpsMetrics> {
  const [providers, pending, resv, counts, support, webhooks] = await Promise.all([
    getProviderMetricsSummary(60),
    query<{ id: string; type: string; status: string; amount_minor: string; created_at: string }>(
      `SELECT id, type, status, amount_minor, created_at FROM transactions
       WHERE status IN ('initiated','pending_vendor') AND created_at < now() - interval '10 minutes'
       ORDER BY created_at ASC LIMIT 20`
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM reservations WHERE status = 'held'`),
    query<{ fraud: string; kyc: string; business: string; agents: string }>(
      `SELECT
        (SELECT COUNT(*) FROM fraud_queue WHERE status IN ('open','in_review')) AS fraud,
        (SELECT COUNT(*) FROM users WHERE kyc_status = 'pending') AS kyc,
        (SELECT COUNT(*) FROM business_accounts WHERE kyb_status = 'pending') AS business,
        (SELECT COUNT(*) FROM agents WHERE status = 'pending') AS agents`
    ),
    getSupportStats(),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM webhook_events
       WHERE processed = false AND received_at >= now() - interval '24 hours'`
    ).catch(() => ({ rows: [{ count: "0" }] })),
  ]);

  return {
    providers,
    pendingTxns: pending.rows,
    reservationsHeld: Number(resv.rows[0]?.count ?? 0),
    fraudOpen: Number(counts.rows[0]?.fraud ?? 0),
    kycPending: Number(counts.rows[0]?.kyc ?? 0),
    businessPending: Number(counts.rows[0]?.business ?? 0),
    agentsPending: Number(counts.rows[0]?.agents ?? 0),
    support,
    webhookFailures24h: Number(webhooks.rows[0]?.count ?? 0),
  };
}
