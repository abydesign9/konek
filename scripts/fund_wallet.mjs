// Local helper: credit a user's NGN wallet via a proper balanced journal
// (platform gateway -> user wallet) plus a delivered fund_wallet transaction,
// so it shows correctly in history and the cached balance. Dev only.
//
//   PROVISION_PHONE=+234... FUND_NAIRA=100000 \
//     node -r dotenv/config scripts/fund_wallet.mjs dotenv_config_path=.env.local
import pg from "pg";

const PHONE = process.env.PROVISION_PHONE ?? "+2347040147477";
const NAIRA = Number(process.env.FUND_NAIRA ?? "100000");
const amountMinor = Math.round(NAIRA * 100);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

async function accountId(ownerType, ownerId, kind) {
  const f = await client.query(
    `SELECT id FROM ledger_accounts WHERE owner_type=$1 AND owner_id IS NOT DISTINCT FROM $2 AND currency='NGN' AND kind=$3`,
    [ownerType, ownerId, kind]
  );
  if (f.rows[0]) return f.rows[0].id;
  const c = await client.query(
    `INSERT INTO ledger_accounts (owner_type, owner_id, currency, kind) VALUES ($1,$2,'NGN',$3) RETURNING id`,
    [ownerType, ownerId, kind]
  );
  return c.rows[0].id;
}

try {
  const u = await client.query("SELECT id FROM users WHERE phone=$1", [PHONE]);
  if (!u.rows[0]) throw new Error(`no user for ${PHONE}`);
  const userId = u.rows[0].id;

  await client.query("BEGIN");
  const wallet = await accountId("user", userId, "wallet");
  const gateway = await accountId("platform", null, "gateway");

  const txn = await client.query(
    `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, vendor, vendor_ref)
     VALUES ($1,$2,'fund_wallet','delivered','NGN',$3,'manual','ADMIN_CREDIT') RETURNING id`,
    [userId, `fund:${crypto.randomUUID()}`, amountMinor]
  );
  const txnId = txn.rows[0].id;

  const j = await client.query(`INSERT INTO journals (txn_id, description) VALUES ($1,'Manual wallet funding') RETURNING id`, [txnId]);
  const journalId = j.rows[0].id;
  for (const [acc, amt] of [[gateway, -amountMinor], [wallet, amountMinor]]) {
    await client.query(`INSERT INTO ledger_entries (journal_id, account_id, amount_minor, currency) VALUES ($1,$2,$3,'NGN')`, [journalId, acc, amt]);
    await client.query(
      `INSERT INTO account_balances (account_id, balance_minor) VALUES ($1,$2)
       ON CONFLICT (account_id) DO UPDATE SET balance_minor = account_balances.balance_minor + EXCLUDED.balance_minor, updated_at=now()`,
      [acc, amt]
    );
  }
  await client.query(`UPDATE transactions SET journal_id=$2 WHERE id=$1`, [txnId, journalId]);
  await client.query(
    `INSERT INTO transaction_events (txn_id, from_status, to_status) VALUES ($1,NULL,'delivered')`,
    [txnId]
  );
  await client.query("COMMIT");

  const b = await client.query(`SELECT balance_minor FROM account_balances WHERE account_id=$1`, [wallet]);
  console.log(`Funded ${PHONE} +₦${NAIRA.toLocaleString()}. New NGN balance: ₦${(Number(b.rows[0].balance_minor)/100).toLocaleString()}`);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
