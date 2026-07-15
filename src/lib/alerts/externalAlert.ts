// Generic hook for ops alerts (new ticket, failed txn, fraud score, provider
// outage, KYC pending, chargeback...). No real webhook exists yet — this
// logs today and is the single place to point at Discord (or Slack) the
// moment real credentials exist. Callers never change when that happens.
export type AlertEvent =
  | "support_ticket_created"
  | "support_sla_breach"
  | "transaction_failed"
  | "fraud_score_high"
  | "provider_outage"
  | "large_transaction"
  | "kyc_pending"
  | "chargeback";

export async function sendExternalAlert(event: AlertEvent, message: string, meta?: Record<string, unknown>): Promise<void> {
  console.log(`[external-alert:${event}] ${message}`, meta ? JSON.stringify(meta) : "");
  // Swap in a real delivery call here once a webhook URL exists, e.g.:
  //   if (process.env.DISCORD_WEBHOOK_URL) await fetch(process.env.DISCORD_WEBHOOK_URL, { method: "POST", ... })
}
