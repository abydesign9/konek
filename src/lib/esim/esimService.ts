import { query } from "@/lib/db";
import { getEsimProvider } from "@/vendors/esim/registry";
import { EsimActivation, EsimStatus } from "@/vendors/esim/types";
import { defaultSmdpAddress, lpaQrPayload, lpaString } from "@/vendors/esim/lpa";

export class EsimNotIssuedError extends Error {
  constructor() {
    super("eSIM not yet issued");
    this.name = "EsimNotIssuedError";
  }
}
export class EsimNotFoundError extends Error {
  constructor() {
    super("eSIM not found");
    this.name = "EsimNotFoundError";
  }
}

export interface EsimRow {
  id: string;
  user_id: string;
  txn_id: string;
  provider: string;
  plan_external_id: string | null;
  iccid: string | null;
  smdp_address: string | null;
  matching_id: string | null;
  status: EsimStatus;
  total_mb: string | null;
  used_mb: string;
  expires_at: string | null;
}

interface TxnRow {
  id: string;
  user_id: string;
  status: string;
  type: string;
  token: string | null;
  vendor: string | null;
  recipient: { planExternalId?: string } | null;
}

// Ensures an esims lifecycle row exists for a delivered eSIM transaction, then
// returns it. Idempotent (unique on txn_id) so it's safe to call from any read
// path — this is how rows come to exist for both synchronously-delivered and
// recovery-settled eSIMs, without coupling the generic settlement code to eSIM.
export async function ensureEsimForTxn(txnId: string, userId: string): Promise<EsimRow> {
  const { rows: txnRows } = await query<TxnRow>(
    `SELECT id, user_id, status, type, token, vendor, recipient FROM transactions
      WHERE id = $1 AND user_id = $2 AND type = 'esim'`,
    [txnId, userId]
  );
  const txn = txnRows[0];
  if (!txn) throw new EsimNotFoundError();
  if (txn.status !== "delivered" || !txn.token) throw new EsimNotIssuedError();

  const planExternalId = txn.recipient?.planExternalId ?? null;
  const provider = txn.vendor ?? "unknown";
  const iccid = txn.token;

  // Plan allowance + validity from the catalog (source of truth for what we sold).
  const { rows: planRows } = await query<{ meta: { dataMb?: number; validityDays?: number } | null }>(
    `SELECT meta FROM catalog_items WHERE service_type = 'esim' AND external_id = $1 LIMIT 1`,
    [planExternalId]
  );
  const totalMb = planRows[0]?.meta?.dataMb ?? null;
  const validityDays = planRows[0]?.meta?.validityDays ?? null;

  // Activation details from the provider (falls back to defaults if unavailable).
  let smdp = defaultSmdpAddress();
  let matchingId = iccid;
  const esimProvider = getEsimProvider(provider);
  if (esimProvider?.capabilities.supportsActivationFetch) {
    try {
      const act = await esimProvider.getActivation(iccid);
      smdp = act.smdpAddress;
      matchingId = act.matchingId;
    } catch {
      // keep defaults
    }
  }

  await query(
    `INSERT INTO esims (user_id, txn_id, provider, plan_external_id, iccid, smdp_address, matching_id, status, total_mb, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'issued',$8, CASE WHEN $9::int IS NULL THEN NULL ELSE now() + ($9::int || ' days')::interval END)
     ON CONFLICT (txn_id) DO NOTHING`,
    [userId, txnId, provider, planExternalId, iccid, smdp, matchingId, totalMb, validityDays]
  );

  const { rows } = await query<EsimRow>(`SELECT * FROM esims WHERE txn_id = $1`, [txnId]);
  return rows[0];
}

export interface EsimUsageView {
  iccid: string | null;
  status: EsimStatus;
  totalMb: number | null;
  usedMb: number;
  remainingMb: number | null;
  expiresAt: string | null;
}

// Refreshes usage from the provider and reconciles it against the sold allowance
// + expiry to derive the lifecycle status, persisting the result.
export async function refreshEsimUsage(row: EsimRow): Promise<EsimUsageView> {
  const total = row.total_mb !== null ? Number(row.total_mb) : null;
  let used = Number(row.used_mb);

  const provider = getEsimProvider(row.provider);
  if (provider?.capabilities.supportsUsage && row.iccid) {
    try {
      const u = await provider.getUsage(row.iccid);
      used = total !== null ? Math.min(u.usedMb, total) : u.usedMb;
    } catch {
      // keep last-known usage
    }
  }

  const expired = row.expires_at !== null && new Date(row.expires_at).getTime() < Date.now();
  const depleted = total !== null && used >= total;
  const status: EsimStatus = expired ? "expired" : depleted ? "depleted" : "active";
  const remaining = total !== null ? Math.max(total - used, 0) : null;

  await query(
    `UPDATE esims SET used_mb = $2, status = $3, usage_synced_at = now(), updated_at = now() WHERE id = $1`,
    [row.id, used, status]
  );

  return { iccid: row.iccid, status, totalMb: total, usedMb: used, remainingMb: remaining, expiresAt: row.expires_at };
}

export async function getEsimUsage(txnId: string, userId: string): Promise<EsimUsageView> {
  const row = await ensureEsimForTxn(txnId, userId);
  return refreshEsimUsage(row);
}

export async function getEsimActivation(txnId: string, userId: string): Promise<EsimActivation> {
  const row = await ensureEsimForTxn(txnId, userId);
  const iccid = row.iccid ?? "";
  const provider = getEsimProvider(row.provider);
  if (provider?.capabilities.supportsActivationFetch) {
    try {
      return await provider.getActivation(iccid);
    } catch {
      // fall through to stored/default
    }
  }
  const smdp = row.smdp_address ?? defaultSmdpAddress();
  const matchingId = row.matching_id ?? iccid;
  return { iccid, smdpAddress: smdp, matchingId, lpaString: lpaString(smdp, matchingId), qrPayload: lpaQrPayload(smdp, matchingId) };
}
