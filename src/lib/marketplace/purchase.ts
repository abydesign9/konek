import { query } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { getUserWalletAccount, getPlatformAccount } from "@/lib/ledger/accounts";
import { postJournal } from "@/lib/ledger/postJournal";
import { getBalance } from "@/lib/ledger/balance";
import {
  InsufficientBalanceError,
  isWalletInsufficientError,
  settleReservation,
  releaseReservation,
} from "@/lib/ledger/reservations";
import { checkVelocityLimits } from "@/lib/limits/checkLimits";
import { usdMinorToNgnMinor } from "@/lib/fx";
import { isCircuitOpen } from "@/lib/http/resilientHttp";
import { getAdapterById } from "@/vendors/registry";
import { getEsimProvider } from "@/vendors/esim/registry";
import { defaultSmdpAddress } from "@/vendors/esim/lpa";
import { logAudit } from "@/lib/audit";
import { selectSuppliers, type SupplierOption } from "./selection";
import { runFailover, type AttemptRecord } from "./failover";

const CURRENCY = "NGN";

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not available");
    this.name = "ProductNotFoundError";
  }
}
export class NoSupplierError extends Error {
  constructor() {
    super("This product is temporarily out of stock");
    this.name = "NoSupplierError";
  }
}

export interface MarketplacePurchaseInput {
  userId: string;
  catalogProductId: string;
  idempotencyKey: string;
}

export interface MarketplacePurchaseResult {
  txnId: string;
  status: "delivered" | "pending" | "failed";
  supplierId?: string; // internal — never surfaced to the customer
}

// Build the ranked supplier options for a product: its live SKUs joined to the
// supplier's health (vendors row + circuit breaker).
async function supplierOptions(catalogProductId: string): Promise<SupplierOption[]> {
  const { rows } = await query<{
    supplier_product_id: string;
    supplier_id: string;
    supplier_sku: string;
    supplier_cost_minor: string;
    currency: string;
    stock_status: string;
    api_status: string;
    active: boolean;
    purchase_priority: number;
    success_rate: string | null;
    average_response_ms: number | null;
    enabled: boolean;
    healthy: boolean;
    maintenance: boolean;
  }>(
    `SELECT sp.id AS supplier_product_id, sp.supplier_id, sp.supplier_sku, sp.supplier_cost_minor,
            sp.currency, sp.stock_status, sp.api_status, sp.active, sp.purchase_priority,
            v.success_rate, v.average_response_ms, v.enabled, v.healthy, v.maintenance
       FROM supplier_products sp
       JOIN vendors v ON v.id = sp.supplier_id
      WHERE sp.catalog_product_id = $1`,
    [catalogProductId]
  );

  return rows.map((r) => ({
    supplierProductId: r.supplier_product_id,
    supplierId: r.supplier_id,
    supplierSku: r.supplier_sku,
    costMinor: Number(r.supplier_cost_minor),
    currency: r.currency,
    stockStatus: r.stock_status,
    apiStatus: r.api_status,
    active: r.active,
    purchasePriority: r.purchase_priority,
    successRate: r.success_rate == null ? null : Number(r.success_rate),
    averageResponseMs: r.average_response_ms,
    supplierEnabled: r.enabled && !r.maintenance,
    supplierHealthy: r.healthy,
    circuitOpen: isCircuitOpen(r.supplier_id),
  }));
}

async function logAttempt(
  txnId: string,
  catalogProductId: string,
  a: AttemptRecord
): Promise<void> {
  await query(
    `INSERT INTO purchase_attempts
       (txn_id, catalog_product_id, supplier_id, attempt_no, status, error_code, error_message, latency_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [txnId, catalogProductId, a.supplierId, a.attemptNo, a.status, a.errorCode ?? null, a.errorMessage ?? null, a.latencyMs ?? null]
  );
}

// Roll the supplier's success rate + average latency forward from its recent
// attempts, so selection keeps improving without a separate job.
async function refreshSupplierStats(supplierId: string): Promise<void> {
  await query(
    `UPDATE vendors v SET
        success_rate = s.rate,
        average_response_ms = s.avg_ms
       FROM (
         SELECT AVG((status = 'success')::int)::numeric(5,4) AS rate,
                AVG(latency_ms)::int AS avg_ms
           FROM purchase_attempts
          WHERE supplier_id = $1 AND created_at >= now() - interval '30 days'
       ) s
      WHERE v.id = $1`,
    [supplierId]
  );
}

// Buy a marketplace product. Reserves the customer price, then tries suppliers in
// the ranked order until one delivers (or accepts as pending), logging every
// attempt. On total failure the hold is released. The customer never learns which
// supplier fulfilled — or that others failed.
export async function marketplacePurchase(input: MarketplacePurchaseInput): Promise<MarketplacePurchaseResult> {
  return withIdempotency(`mktpurchase:${input.userId}:${input.idempotencyKey}`, { ...input }, async () => {
    // Load the listing + its display price (already derived by the pricing engine).
    const { rows: prodRows } = await query<{
      display_price_minor: string | null;
      currency: string;
      recommended_supplier_id: string | null;
      active: boolean;
      data_amount: string;
      validity: number;
      display_name: string;
    }>(
      `SELECT display_price_minor, currency, recommended_supplier_id, active, data_amount, validity, display_name
         FROM catalog_products WHERE id = $1`,
      [input.catalogProductId]
    );
    const product = prodRows[0];
    if (!product || !product.active || product.display_price_minor == null) throw new ProductNotFoundError();

    const chain = selectSuppliers(await supplierOptions(input.catalogProductId), {
      recommendedSupplierId: product.recommended_supplier_id,
    }).chain;
    if (chain.length === 0) throw new NoSupplierError();

    // Customer pays the display price (USD) from their NGN wallet at today's rate.
    const priceMinorUsd = Number(product.display_price_minor);
    const chargeMinorNgn = product.currency === "USD" ? await usdMinorToNgnMinor(priceMinorUsd) : priceMinorUsd;

    await checkVelocityLimits(input.userId, chargeMinorNgn, CURRENCY);

    const walletAccountId = await getUserWalletAccount(input.userId, CURRENCY);
    const reserveAccountId = await getPlatformAccount(CURRENCY, "reserve");
    if ((await getBalance(walletAccountId)) < chargeMinorNgn) throw new InsufficientBalanceError();

    const recipient = {
      catalogProductId: input.catalogProductId,
      displayCurrency: product.currency,
      displayAmountMinor: priceMinorUsd,
      dataMb: Math.round(Number(product.data_amount) * 1024),
      validityDays: product.validity,
    };

    const txnRes = await query<{ id: string }>(
      `INSERT INTO transactions (user_id, idempotency_key, type, status, currency, amount_minor, recipient)
       VALUES ($1,$2,'esim','initiated',$3,$4,$5) RETURNING id`,
      [input.userId, input.idempotencyKey, CURRENCY, chargeMinorNgn, JSON.stringify(recipient)]
    );
    const txnId = txnRes.rows[0].id;

    // RESERVE (wallet -> reserve). The wallet_nonneg trigger stops an overdraw.
    let reservationJournalId: string;
    try {
      const reserved = await postJournal({
        txnId,
        journalType: "reservation",
        description: `Reservation for ${product.display_name}`,
        entries: [
          { accountId: walletAccountId, amountMinor: -chargeMinorNgn, currency: CURRENCY },
          { accountId: reserveAccountId, amountMinor: chargeMinorNgn, currency: CURRENCY },
        ],
      });
      reservationJournalId = reserved.journalId;
    } catch (err) {
      if (isWalletInsufficientError(err)) {
        await query(`UPDATE transactions SET status='failed', failure_reason='insufficient_balance' WHERE id=$1`, [txnId]);
        throw new InsufficientBalanceError();
      }
      throw err;
    }
    await query(
      `INSERT INTO reservations (txn_id, user_id, wallet_account_id, reserve_account_id, amount_minor, currency, reservation_journal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [txnId, input.userId, walletAccountId, reserveAccountId, chargeMinorNgn, CURRENCY, reservationJournalId]
    );
    await query(`UPDATE transactions SET status='pending_vendor' WHERE id=$1`, [txnId]);

    // FAILOVER: try suppliers in order.
    const result = await runFailover(chain, async (supplier, attemptNo) => {
      const adapter = getAdapterById(supplier.supplierId);
      if (!adapter) return { status: "failed" as const, errorMessage: `no adapter for ${supplier.supplierId}` };
      const startedAt = Date.now();
      try {
        const r = await adapter.purchase({
          reference: `${txnId}:${attemptNo}`,
          serviceType: "esim",
          network: supplier.supplierSku,
          phone: "na",
          planExternalId: supplier.supplierSku,
          amountMinor: chargeMinorNgn,
          currency: CURRENCY,
        });
        return {
          status: r.status === "delivered" ? "success" : r.status === "pending" ? "pending" : "failed",
          vendorRef: r.vendorRef,
          token: r.token,
          latencyMs: Date.now() - startedAt,
          raw: r.raw,
        };
      } catch (err) {
        return { status: "failed" as const, errorMessage: err instanceof Error ? err.message : String(err), latencyMs: Date.now() - startedAt };
      }
    });

    for (const a of result.attempts) await logAttempt(txnId, input.catalogProductId, a);
    for (const supplierId of new Set(result.attempts.map((a) => a.supplierId))) await refreshSupplierStats(supplierId);

    if (result.outcome === "failed") {
      await releaseReservation(txnId, { reason: "all_suppliers_failed" });
      await logAudit(input.userId, "marketplace_purchase_failed", "transaction", txnId, {
        catalogProductId: input.catalogProductId,
        attempts: result.attempts.length,
      });
      return { txnId, status: "failed" };
    }

    const winner = result.winner!;
    // Record the fulfilling supplier + activation reference on the transaction.
    await query(
      `UPDATE transactions
          SET vendor = $2,
              token = COALESCE($3, token),
              recipient = recipient || $4::jsonb
        WHERE id = $1`,
      [txnId, winner.supplierId, winner.token ?? null, JSON.stringify({ planExternalId: winner.supplierSku, supplierProductId: winner.supplierProductId })]
    );

    if (result.outcome === "pending") {
      // Order accepted but the profile isn't ready — money stays held; the
      // reservation-recovery sweep settles it via the adapter's verify().
      return { txnId, status: "pending", supplierId: winner.supplierId };
    }

    // Delivered: settle the hold and provision the eSIM row.
    await settleReservation(txnId, { vendorRef: winner.vendorRef, token: winner.token });
    await provisionEsim(txnId, input.userId, winner, recipient.dataMb, recipient.validityDays);

    await logAudit(input.userId, "marketplace_purchase_delivered", "transaction", txnId, {
      catalogProductId: input.catalogProductId,
      supplierId: winner.supplierId,
      attempts: result.attempts.length,
    });
    return { txnId, status: "delivered", supplierId: winner.supplierId };
  });
}

// Write the esims lifecycle row from the winning attempt + the sold allowance,
// pulling activation (SM-DP+/matching id) from the fulfilling provider.
async function provisionEsim(
  txnId: string,
  userId: string,
  winner: AttemptRecord,
  totalMb: number | null,
  validityDays: number | null
): Promise<void> {
  const iccid = winner.token ?? null;
  let smdp = defaultSmdpAddress();
  let matchingId = iccid ?? "";
  let activationCode = winner.token ?? null;

  const provider = getEsimProvider(winner.supplierId);
  if (iccid && provider?.capabilities.supportsActivationFetch) {
    try {
      const act = await provider.getActivation(iccid);
      smdp = act.smdpAddress || smdp;
      matchingId = act.matchingId || matchingId;
      activationCode = act.lpaString || activationCode;
    } catch {
      // keep what we have
    }
  }

  await query(
    `INSERT INTO esims (user_id, txn_id, provider, plan_external_id, iccid, smdp_address, matching_id, activation_code, status, total_mb, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'issued',$9,
             CASE WHEN $10::int IS NULL THEN NULL ELSE now() + ($10::int || ' days')::interval END)
     ON CONFLICT (txn_id) DO NOTHING`,
    [userId, txnId, winner.supplierId, winner.supplierSku, iccid, smdp, matchingId, activationCode, totalMb, validityDays]
  );
}
