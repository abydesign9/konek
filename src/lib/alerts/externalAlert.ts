// Generic hook for ops alerts (new ticket, failed txn, fraud score, provider
// outage, KYC pending, chargeback...). Posts a Discord embed when
// DISCORD_WEBHOOK_URL is set; always logs regardless, so behavior is
// visible in dev even without a webhook. Callers never change when real
// credentials show up — set the env var and delivery goes live.
export type AlertEvent =
  | "support_ticket_created"
  | "support_ticket_assigned"
  | "support_sla_breach"
  | "transaction_failed"
  | "fraud_score_high"
  | "provider_outage"
  | "large_transaction"
  | "kyc_pending"
  | "chargeback"
  | "side_effect_failed"
  | "margin_breach"
  | "catalog_sync_failed";

// Discord embed side-bar colors (decimal), roughly by severity.
const EVENT_COLOR: Record<AlertEvent, number> = {
  support_ticket_created: 0x22315c, // indigo
  support_ticket_assigned: 0x22315c,
  support_sla_breach: 0xe2932f, // amber
  transaction_failed: 0xe2932f,
  fraud_score_high: 0xc0392b, // red
  provider_outage: 0xc0392b,
  large_transaction: 0xe2932f,
  kyc_pending: 0x2e9e6b, // green — routine review item, not an incident
  chargeback: 0xc0392b,
  side_effect_failed: 0xe2932f, // amber — purchase succeeded, a follow-on hook did not
  margin_breach: 0xc0392b, // red — a plan would sell below the min margin; held back
  catalog_sync_failed: 0xe2932f, // amber — a catalog sync run failed
};

async function postToDiscord(event: AlertEvent, message: string, meta?: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const fields = meta
    ? Object.entries(meta).map(([name, value]) => ({
        name,
        value: typeof value === "string" ? value : JSON.stringify(value),
        inline: true,
      }))
    : undefined;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            description: message,
            color: EVENT_COLOR[event],
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[external-alert:${event}] Discord webhook returned ${res.status}`);
    }
  } catch (err) {
    // Ops alerting must never break the caller's actual operation (a
    // failed purchase, a fraud flag, a ticket) — log and move on.
    console.error(`[external-alert:${event}] Discord webhook delivery failed`, err);
  }
}

export async function sendExternalAlert(event: AlertEvent, message: string, meta?: Record<string, unknown>): Promise<void> {
  console.log(`[external-alert:${event}] ${message}`, meta ? JSON.stringify(meta) : "");
  await postToDiscord(event, message, meta);
}
