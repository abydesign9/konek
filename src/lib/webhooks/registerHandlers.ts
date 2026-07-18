import { registerWebhookHandler, WebhookContext } from "./webhookFramework";
import { creditFromPayment } from "@/lib/wallet/creditFromPayment";
import { creditDollarInflow } from "@/lib/dollarAccount/dollarAccountService";

// Central registration of every provider's webhook handler. Imported by both the
// webhook routes (live delivery) and the cron replay worker, so a failed event
// can be replayed even though the original HTTP route module isn't loaded.
// Registration is an idempotent Map.set, safe to import many times.

// Paystack: on a successful charge, credit the wallet. creditFromPayment
// re-fetches the authoritative amount/status from Paystack's verify endpoint —
// the webhook payload's amount/status is never trusted.
export const paystackHandler = async (ctx: WebhookContext) => {
  if (ctx.eventType === "charge.success" && ctx.reference) {
    await creditFromPayment(ctx.reference);
    return { credited: true, reference: ctx.reference };
  }
  return { ignored: true, eventType: ctx.eventType };
};
registerWebhookHandler("paystack", paystackHandler);

// Fincra (mock): a USD virtual-account inflow. creditDollarInflow re-fetches the
// authoritative inflow from the provider — the callback body is never trusted —
// and credits the USD wallet exactly once per inflow reference.
export const fincraHandler = async (ctx: WebhookContext) => {
  if (ctx.eventType === "inflow.received" && ctx.reference) {
    await creditDollarInflow(ctx.reference);
    return { credited: true, inflowRef: ctx.reference };
  }
  return { ignored: true, eventType: ctx.eventType };
};
registerWebhookHandler("mock_fincra", fincraHandler);

// Import side-effect registers all handlers; call this to make the dependency
// explicit where needed (e.g. before running the replay worker).
export function ensureWebhookHandlersRegistered(): void {
  /* registration happens at module import above */
}
