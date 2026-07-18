import { query } from "@/lib/db";
import { getAdapterById } from "@/vendors/registry";
import { settleReservation, releaseReservation } from "@/lib/ledger/reservations";
import { sendExternalAlert } from "@/lib/alerts/externalAlert";

// Default age after which a still-held reservation is considered stale and
// eligible for reconciliation.
const DEFAULT_TIMEOUT_MINUTES = 5;

export interface RecoveryResult {
  scanned: number;
  settled: number;
  released: number;
  inconclusive: number;
}

interface StaleRow {
  txn_id: string;
  vendor: string | null;
  vendor_ref: string | null;
  txn_status: string;
}

// Reconciles reservations that are still 'held' past the timeout — the case
// where an inline purchase crashed between reserving funds and settling/
// releasing them. It reasons about *reservations*, not transaction status
// alone, so a reservation can never be silently stranded.
//
// For each stale reservation we ask the vendor adapter's authoritative verify()
// what actually happened:
//   * delivered            -> settle   (reserve -> vendor float)
//   * failed / expired      -> release  (reserve -> wallet)
//   * pending / unknown     -> leave for the next cycle
//   * vendor never engaged  -> release  (status still 'initiated', no vendor_ref)
//
// Every branch calls the same idempotent settle/release helpers, whose guarded
// claim (held -> settled/released) means repeated cron runs — or a race with a
// late inline completion — can never double-settle or double-release.
export async function recoverStaleReservations(
  timeoutMinutes: number = DEFAULT_TIMEOUT_MINUTES
): Promise<RecoveryResult> {
  const { rows } = await query<StaleRow>(
    `SELECT r.txn_id, t.vendor, t.vendor_ref, t.status AS txn_status
       FROM reservations r
       JOIN transactions t ON t.id = r.txn_id
      WHERE r.status = 'held'
        AND r.created_at < now() - ($1 || ' minutes')::interval
      ORDER BY r.created_at ASC
      LIMIT 200`,
    [String(timeoutMinutes)]
  );

  const result: RecoveryResult = { scanned: rows.length, settled: 0, released: 0, inconclusive: 0 };

  for (const row of rows) {
    try {
      // Vendor was never engaged (still initiated, no ref): nothing was ordered,
      // so returning the funds to the wallet is safe.
      if (!row.vendor_ref && row.txn_status === "initiated") {
        const out = await releaseReservation(row.txn_id, { reason: "reservation_expired_no_vendor" });
        if (out.released) result.released += 1;
        continue;
      }

      // pending_vendor but no ref: the purchase() call was in flight when we
      // crashed and we have no handle to verify. Conservatively leave it.
      if (!row.vendor_ref) {
        result.inconclusive += 1;
        continue;
      }

      const adapter = row.vendor ? getAdapterById(row.vendor) : undefined;
      if (!adapter) {
        result.inconclusive += 1;
        await sendExternalAlert("provider_outage", `Recovery: no adapter for vendor ${row.vendor}`, {
          txnId: row.txn_id,
          vendor: row.vendor,
        }).catch(() => {});
        continue;
      }

      const verified = await adapter.verify(row.vendor_ref);
      if (verified.status === "delivered") {
        const out = await settleReservation(row.txn_id, { vendorRef: row.vendor_ref, raw: verified.raw });
        if (out.settled) result.settled += 1;
      } else if (verified.status === "failed") {
        const out = await releaseReservation(row.txn_id, {
          reason: "vendor_verify_failed",
          vendorRef: row.vendor_ref,
          raw: verified.raw,
        });
        if (out.released) result.released += 1;
      } else {
        result.inconclusive += 1; // still pending — try again next cycle
      }
    } catch (err) {
      // Never let one bad reservation abort the whole sweep.
      result.inconclusive += 1;
      await sendExternalAlert("transaction_failed", `Reservation recovery error for txn ${row.txn_id}`, {
        txnId: row.txn_id,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => {});
    }
  }

  return result;
}
