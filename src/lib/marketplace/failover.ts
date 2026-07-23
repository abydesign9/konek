import type { SupplierOption } from "./selection";

// Pure failover runner. Given the ranked supplier chain and a function that tries
// ONE supplier, it walks the chain until a supplier delivers (or is pending), or
// the retry limit is hit — recording every attempt. Kept pure so the retry/stop
// logic is unit-tested without a database or live provider.

export type AttemptStatus = "success" | "pending" | "failed";

export interface AttemptOutcome {
  status: AttemptStatus;
  vendorRef?: string;
  token?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  raw?: unknown;
}

export interface AttemptRecord extends AttemptOutcome {
  attemptNo: number;
  supplierId: string;
  supplierProductId: string;
  supplierSku: string;
}

export interface FailoverResult {
  outcome: "delivered" | "pending" | "failed";
  winner: AttemptRecord | null;
  attempts: AttemptRecord[];
}

// `attempt` performs the real purchase against one supplier and returns its
// outcome (it should not throw for a business failure — throwing is treated as a
// failed attempt so the chain continues).
export async function runFailover(
  chain: SupplierOption[],
  attempt: (supplier: SupplierOption, attemptNo: number) => Promise<AttemptOutcome>,
  maxAttempts = 3
): Promise<FailoverResult> {
  const attempts: AttemptRecord[] = [];
  const limit = Math.min(chain.length, maxAttempts);

  for (let i = 0; i < limit; i++) {
    const supplier = chain[i];
    const attemptNo = i + 1;
    let outcome: AttemptOutcome;
    try {
      outcome = await attempt(supplier, attemptNo);
    } catch (err) {
      outcome = { status: "failed", errorMessage: err instanceof Error ? err.message : String(err) };
    }

    const record: AttemptRecord = {
      ...outcome,
      attemptNo,
      supplierId: supplier.supplierId,
      supplierProductId: supplier.supplierProductId,
      supplierSku: supplier.supplierSku,
    };
    attempts.push(record);

    // Stop the moment a supplier delivers or accepts the order (pending). Money
    // stays held on pending; only a hard failure moves us to the next supplier.
    if (outcome.status === "success") return { outcome: "delivered", winner: record, attempts };
    if (outcome.status === "pending") return { outcome: "pending", winner: record, attempts };
  }

  return { outcome: "failed", winner: null, attempts };
}
