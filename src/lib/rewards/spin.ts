import { query, withTransaction } from "@/lib/db";
import { withIdempotency, IdempotencyInProgressError } from "@/lib/idempotency";
import { bumpCoinBalance } from "@/lib/gamification/coinBalance";
import { postJournal } from "@/lib/ledger/postJournal";
import { getOrCreateAccount, getUserWalletAccount } from "@/lib/ledger/accounts";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/send";

// M10 Spin Rewards. One free spin per calendar day. Prizes are coins and/or
// small NGN product credit — never cash: credit lands in the NGN wallet,
// which can only be spent on raviion services (no withdrawal path exists in
// Phase 1), satisfying "Product Credit Only, Never Cash" from the spec.
interface SpinOutcome {
  label: string;
  weight: number;
  coins: number;
  creditMinor: number; // NGN kobo
}

const OUTCOMES: SpinOutcome[] = [
  { label: "10 coins", weight: 40, coins: 10, creditMinor: 0 },
  { label: "25 coins", weight: 25, coins: 25, creditMinor: 0 },
  { label: "50 coins", weight: 15, coins: 50, creditMinor: 0 },
  { label: "₦50 wallet credit", weight: 10, coins: 0, creditMinor: 5000 },
  { label: "100 coins", weight: 5, coins: 100, creditMinor: 0 },
  { label: "₦100 wallet credit", weight: 4, coins: 0, creditMinor: 10000 },
  { label: "₦500 jackpot credit", weight: 1, coins: 0, creditMinor: 50000 },
];

// Stand-in for the spec's "reward budget capped at 15% of monthly gross
// profit" rule — we don't have a live P&L feed in Phase 1, so this is a
// conservative fixed daily ceiling on total real-money payout across all
// users. When it's hit, spins still work but degrade to coins-only for the
// rest of the day rather than failing outright.
const DAILY_CREDIT_BUDGET_MINOR = 5_000_000; // ₦50,000/day platform-wide

export class AlreadySpunTodayError extends Error {
  constructor() {
    super("You've already spun today — come back tomorrow");
    this.name = "AlreadySpunTodayError";
  }
}

export interface SpinResult {
  label: string;
  coins: number;
  creditMinor: number;
  budgetLimited: boolean;
}

export async function getSpinStatus(userId: string): Promise<{ canSpin: boolean; lastResult: SpinResult | null }> {
  const { rows } = await query<{ coins: number; meta: { label: string; creditMinor: number; budgetLimited: boolean } }>(
    `SELECT coins, meta FROM reward_events
     WHERE user_id = $1 AND kind = 'spin' AND created_at >= date_trunc('day', now())
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const last = rows[0];
  return {
    canSpin: !last,
    lastResult: last
      ? { label: last.meta.label, coins: last.coins, creditMinor: last.meta.creditMinor, budgetLimited: last.meta.budgetLimited }
      : null,
  };
}

function pickOutcome(): SpinOutcome {
  const total = OUTCOMES.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const o of OUTCOMES) {
    if (roll < o.weight) return o;
    roll -= o.weight;
  }
  return OUTCOMES[0];
}

export async function spin(userId: string): Promise<SpinResult> {
  const { canSpin } = await getSpinStatus(userId);
  if (!canSpin) throw new AlreadySpunTodayError();

  // Atomic once-per-day guard. getSpinStatus above is a friendly pre-check;
  // this is what actually stops a concurrent double-spin from paying out real
  // wallet credit twice. The first request claims the day key; a racing second
  // request is rejected (in-flight) or returns the first result — never a second
  // payout.
  const today = new Date().toISOString().slice(0, 10);
  try {
    return await withIdempotency(`spin:${userId}:${today}`, { userId, today }, () =>
      runSpin(userId, today)
    );
  } catch (err) {
    if (err instanceof IdempotencyInProgressError) throw new AlreadySpunTodayError();
    throw err;
  }
}

async function runSpin(userId: string, today: string): Promise<SpinResult> {
  const outcome = pickOutcome();
  let creditMinor = outcome.creditMinor;
  let budgetLimited = false;

  if (creditMinor > 0) {
    const { rows: spentRows } = await query<{ spent: string | null }>(
      `SELECT SUM(coins_earn_credit.credit_minor) AS spent FROM (
         SELECT (meta->>'creditMinor')::bigint AS credit_minor FROM reward_events
         WHERE kind = 'spin' AND created_at >= date_trunc('day', now())
       ) coins_earn_credit`
    );
    const spentToday = spentRows[0]?.spent ? Number(spentRows[0].spent) : 0;
    if (spentToday + creditMinor > DAILY_CREDIT_BUDGET_MINOR) {
      creditMinor = 0;
      budgetLimited = true;
    }
  }

  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta)
     VALUES ($1, 'spin', $2, $3, $4)`,
    [userId, outcome.coins, creditMinor, JSON.stringify({ label: outcome.label, creditMinor, budgetLimited })]
  );

  if (outcome.coins > 0) {
    await bumpCoinBalance(userId, outcome.coins);
  }

  if (creditMinor > 0) {
    const walletAccountId = await getUserWalletAccount(userId, "NGN");
    const expenseAccountId = await getOrCreateAccount("platform", null, "NGN", "expense");

    // Atomic: the reward transaction + its journal are one unit. A stable
    // per-day idempotency key (not Date.now()) keeps a same-day retry from
    // creating a duplicate transaction.
    await withTransaction(async (client) => {
      const txnRes = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor)
         VALUES ($1, $2, 'reward_credit', 'delivered', 'NGN', $3) RETURNING id`,
        [userId, `spin_credit:${userId}:${today}`, creditMinor]
      );
      const txnId = (txnRes.rows[0] as { id: string }).id;
      const posted = await postJournal(
        {
          txnId,
          journalType: "reward",
          description: `Spin reward: ${outcome.label}`,
          entries: [
            { accountId: expenseAccountId, amountMinor: -creditMinor, currency: "NGN" },
            { accountId: walletAccountId, amountMinor: creditMinor, currency: "NGN" },
          ],
        },
        client as never
      );
      await client.query(`UPDATE transactions SET journal_id = $2 WHERE id = $1`, [txnId, posted.journalId]);
      await client.query(
        `INSERT INTO transaction_events (txn_id, from_status, to_status) VALUES ($1, NULL, 'delivered')`,
        [txnId]
      );
    });
  }

  await logAudit(userId, "spin_reward", "user", userId, { label: outcome.label, coins: outcome.coins, creditMinor });
  await sendNotification(
    userId,
    "push",
    "txn_receipt",
    "You spun a reward!",
    outcome.coins > 0 && creditMinor > 0
      ? `${outcome.coins} coins + ₦${(creditMinor / 100).toLocaleString()} credit`
      : outcome.coins > 0
      ? `${outcome.coins} coins`
      : `₦${(creditMinor / 100).toLocaleString()} wallet credit`
  );

  return { label: outcome.label, coins: outcome.coins, creditMinor, budgetLimited };
}
