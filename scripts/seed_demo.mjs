// Local demo seed — populates the demo user's wallet with a realistic set of
// transactions so the wallet screens can be viewed on localhost. Safe to
// re-run: it clears its own previously-seeded rows first (idempotency_key
// prefixed 'seed:'). NOT for production.
import pg from "pg";

const DEMO_PHONE = process.env.DEMO_SEED_PHONE ?? "+2348000000001";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function id() {
  return crypto.randomUUID();
}

async function getOrCreateAccount(client, ownerType, ownerId, currency, kind) {
  const found = await client.query(
    `SELECT id FROM ledger_accounts WHERE owner_type=$1 AND owner_id IS NOT DISTINCT FROM $2 AND currency=$3 AND kind=$4`,
    [ownerType, ownerId, currency, kind]
  );
  if (found.rows[0]) return found.rows[0].id;
  const created = await client.query(
    `INSERT INTO ledger_accounts (owner_type, owner_id, currency, kind) VALUES ($1,$2,$3,$4) RETURNING id`,
    [ownerType, ownerId, currency, kind]
  );
  return created.rows[0].id;
}

async function postJournal(client, { txnId, description, entries }) {
  const sum = entries.reduce((a, e) => a + e.amountMinor, 0);
  if (sum !== 0) throw new Error(`unbalanced journal: ${sum}`);
  const j = await client.query(`INSERT INTO journals (txn_id, description) VALUES ($1,$2) RETURNING id`, [
    txnId ?? null,
    description,
  ]);
  const journalId = j.rows[0].id;
  for (const e of entries) {
    await client.query(
      `INSERT INTO ledger_entries (journal_id, account_id, amount_minor, currency) VALUES ($1,$2,$3,$4)`,
      [journalId, e.accountId, e.amountMinor, e.currency]
    );
    await client.query(
      `INSERT INTO account_balances (account_id, balance_minor) VALUES ($1,$2)
       ON CONFLICT (account_id) DO UPDATE SET balance_minor = account_balances.balance_minor + EXCLUDED.balance_minor, updated_at = now()`,
      [e.accountId, e.amountMinor]
    );
  }
  return journalId;
}

async function insertTxn(client, userId, t) {
  const txnId = id();
  await client.query(
    `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, fee_minor, recipient, vendor, vendor_ref, token, journal_id, failure_reason, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)`,
    [
      txnId,
      userId,
      `seed:${txnId}`,
      t.type,
      t.status,
      "NGN",
      t.amount_minor,
      t.fee_minor ?? 0,
      t.recipient ? JSON.stringify(t.recipient) : null,
      t.vendor ?? null,
      t.vendor_ref ?? null,
      t.token ?? null,
      t.journal_id ?? null,
      t.failure_reason ?? null,
      t.created_at,
    ]
  );
  return txnId;
}

const client = await pool.connect();
try {
  const u = await client.query(`SELECT id FROM users WHERE phone=$1`, [DEMO_PHONE]);
  if (!u.rows[0]) {
    console.error(`No user for ${DEMO_PHONE}. Log in via the app once (demo OTP), then re-run.`);
    process.exit(1);
  }
  const userId = u.rows[0].id;

  await client.query("BEGIN");

  // Clear prior seed rows (and their journals/entries) so re-runs are clean.
  const prior = await client.query(
    `SELECT id, journal_id FROM transactions WHERE user_id=$1 AND idempotency_key LIKE 'seed:%'`,
    [userId]
  );
  for (const row of prior.rows) {
    await client.query(`DELETE FROM transaction_events WHERE txn_id=$1`, [row.id]);
  }
  const priorJournalIds = prior.rows.map((r) => r.journal_id).filter(Boolean);
  await client.query(`DELETE FROM transactions WHERE user_id=$1 AND idempotency_key LIKE 'seed:%'`, [userId]);
  for (const jid of priorJournalIds) {
    // reverse the cached balance then drop entries/journal
    const entries = await client.query(`SELECT account_id, amount_minor FROM ledger_entries WHERE journal_id=$1`, [jid]);
    for (const e of entries.rows) {
      await client.query(
        `UPDATE account_balances SET balance_minor = balance_minor - $2 WHERE account_id=$1`,
        [e.account_id, e.amount_minor]
      );
    }
    await client.query(`DELETE FROM ledger_entries WHERE journal_id=$1`, [jid]);
    await client.query(`DELETE FROM journals WHERE id=$1`, [jid]);
  }

  // Promote to Tier 1 so the home dashboard shows the funded state (not the KYC banner).
  await client.query(
    `UPDATE users SET full_name=COALESCE(full_name,'Ada Obi'), kyc_tier=GREATEST(kyc_tier,1), kyc_status='verified', bvn_verified=true, updated_at=now() WHERE id=$1`,
    [userId]
  );

  const wallet = await getOrCreateAccount(client, "user", userId, "NGN", "wallet");
  const gateway = await getOrCreateAccount(client, "platform", null, "NGN", "gateway");
  const vendorFloat = await getOrCreateAccount(client, "vendor", null, "NGN", "float");

  const now = Date.now();
  const h = 3_600_000;

  // 1) Funding +₦50,000 (gateway -> wallet)
  const fundTxn = id();
  const fundJournal = await postJournal(client, {
    txnId: fundTxn,
    description: "Wallet funding via paystack",
    entries: [
      { accountId: gateway, amountMinor: -5_000_000, currency: "NGN" },
      { accountId: wallet, amountMinor: 5_000_000, currency: "NGN" },
    ],
  });
  await client.query(
    `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, vendor, vendor_ref, journal_id, created_at, updated_at)
     VALUES ($1,$2,$3,'fund_wallet','delivered','NGN',5000000,'paystack','PSK_9f2a11', $4, $5,$5)`,
    [fundTxn, userId, `seed:${fundTxn}`, fundJournal, new Date(now - 1 * h).toISOString()]
  );
  await client.query(
    `INSERT INTO transaction_events (txn_id, from_status, to_status, created_at) VALUES
     ($1,'initiated','pending_vendor',$2), ($1,'pending_vendor','delivered',$3)`,
    [fundTxn, new Date(now - 1 * h).toISOString(), new Date(now - 1 * h + 5000).toISOString()]
  );

  // 2) Data -₦1,500 (delivered, wallet -> vendor float)
  const dataTxn = id();
  const dataJournal = await postJournal(client, {
    txnId: dataTxn,
    description: "data purchase via vtu_ng",
    entries: [
      { accountId: wallet, amountMinor: -150_000, currency: "NGN" },
      { accountId: vendorFloat, amountMinor: 150_000, currency: "NGN" },
    ],
  });
  await client.query(
    `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, recipient, vendor, vendor_ref, journal_id, created_at, updated_at)
     VALUES ($1,$2,$3,'data','delivered','NGN',150000,$4,'vtu_ng','VTU-771231',$5,$6,$6)`,
    [dataTxn, userId, `seed:${dataTxn}`, JSON.stringify({ network: "MTN", phone: "+2348031234567", planExternalId: "mtn-2gb-30d" }), dataJournal, new Date(now - 2 * h).toISOString()]
  );

  // 3) Electricity -₦10,000 (delivered, with token)
  const elecTxn = id();
  const elecJournal = await postJournal(client, {
    txnId: elecTxn,
    description: "electricity purchase via vtu_ng",
    entries: [
      { accountId: wallet, amountMinor: -1_000_000, currency: "NGN" },
      { accountId: vendorFloat, amountMinor: 1_000_000, currency: "NGN" },
    ],
  });
  await insertTxn(client, userId, {
    type: "electricity",
    status: "delivered",
    amount_minor: 1_000_000,
    fee_minor: 5_000,
    recipient: { network: "Ikeja Electric", phone: "45010101010", meterNo: "45010101010" },
    vendor: "vtu_ng",
    vendor_ref: "IKEDC-88213771",
    token: "0123-4567-8901-2345-6789",
    journal_id: elecJournal,
    created_at: new Date(now - 26 * h).toISOString(),
  });
  // reuse elecTxn id for its events by looking it up
  const elecRow = await client.query(`SELECT id FROM transactions WHERE journal_id=$1`, [elecJournal]);
  await client.query(
    `INSERT INTO transaction_events (txn_id, from_status, to_status, created_at) VALUES
     ($1,'initiated','pending_vendor',$2), ($1,'pending_vendor','delivered',$3)`,
    [elecRow.rows[0].id, new Date(now - 26 * h).toISOString(), new Date(now - 26 * h + 4000).toISOString()]
  );

  // 4) Intl top-up ₦16,000 (pending) — no journal yet
  await insertTxn(client, userId, {
    type: "intl_topup",
    status: "pending_vendor",
    amount_minor: 1_600_000,
    recipient: { network: "Safaricom", phone: "+254712345678", displayCurrency: "USD", displayAmountMinor: 1000 },
    vendor: "reloadly",
    created_at: new Date(now - 27 * h).toISOString(),
  });

  // 5) Airtime ₦500 (failed) — no journal
  await insertTxn(client, userId, {
    type: "airtime",
    status: "failed",
    amount_minor: 50_000,
    recipient: { network: "Airtel", phone: "+2348090001111" },
    vendor: "vtu_ng",
    failure_reason: "vendor_declined",
    created_at: new Date(now - 50 * h).toISOString(),
  });

  // 6) Reward credit +₦200
  const rewardTxn = id();
  const rewardJournal = await postJournal(client, {
    txnId: rewardTxn,
    description: "reward credit",
    entries: [
      { accountId: gateway, amountMinor: -20_000, currency: "NGN" },
      { accountId: wallet, amountMinor: 20_000, currency: "NGN" },
    ],
  });
  await client.query(
    `INSERT INTO transactions (id, user_id, idempotency_key, type, status, currency, amount_minor, journal_id, created_at, updated_at)
     VALUES ($1,$2,$3,'reward_credit','delivered','NGN',20000,$4,$5,$5)`,
    [rewardTxn, userId, `seed:${rewardTxn}`, rewardJournal, new Date(now - 72 * h).toISOString()]
  );

  await client.query("COMMIT");
  const bal = await client.query(`SELECT balance_minor FROM account_balances WHERE account_id=$1`, [wallet]);
  console.log(`Seeded demo user ${DEMO_PHONE}. NGN wallet balance: ₦${(Number(bal.rows[0].balance_minor) / 100).toLocaleString()}`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
