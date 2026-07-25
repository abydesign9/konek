import { registerWebhookHandler, WebhookContext } from "./webhookFramework";
import { creditFromPayment } from "@/lib/wallet/creditFromPayment";
import { creditDollarInflow } from "@/lib/dollarAccount/dollarAccountService";
import { applyKycWebhookResult } from "@/lib/kyc/verificationService";
import { creditNgnInflow } from "@/lib/ngnAccount/ngnAccountService";

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

// KYC providers (Sumsub, Smile ID, Onfido...) confirm identity/document/liveness
// checks asynchronously. The payload carries the user, method and decision; a
// real integration re-fetches the decision from the provider before trusting it.
export const kycHandler = async (ctx: WebhookContext) => {
  const data = (ctx.payload as { data?: Record<string, unknown> } | undefined)?.data ?? {};
  const userId = typeof data.userId === "string" ? data.userId : null;
  const method = typeof data.method === "string" ? data.method : null;
  const decision = data.decision === "verified" || data.decision === "rejected" ? data.decision : null;
  if (ctx.eventType === "verification.completed" && userId && method && decision) {
    const { tier } = await applyKycWebhookResult({
      userId,
      method,
      decision,
      provider: typeof data.provider === "string" ? data.provider : undefined,
      vendorRef: ctx.reference ?? undefined,
    });
    return { applied: true, userId, method, decision, tier };
  }
  return { ignored: true, eventType: ctx.eventType };
};
registerWebhookHandler("kyc", kycHandler);

// Monnify: a successful transfer to a reserved NGN account. creditNgnInflow
// re-fetches the authoritative transaction from Monnify — the callback body is
// never trusted — and credits the NGN wallet exactly once per reference.
export const monnifyHandler = async (ctx: WebhookContext) => {
  if (ctx.eventType === "SUCCESSFUL_TRANSACTION" && ctx.reference) {
    await creditNgnInflow(ctx.reference);
    return { credited: true, reference: ctx.reference };
  }
  return { ignored: true, eventType: ctx.eventType };
};
registerWebhookHandler("monnify", monnifyHandler);

// Import side-effect registers all handlers; call this to make the dependency
// explicit where needed (e.g. before running the replay worker).
export function ensureWebhookHandlersRegistered(): void {
  /* registration happens at module import above */
}
