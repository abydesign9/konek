# Adding a Provider (VTU / bill-payment aggregator)

The platform is provider-agnostic. Adding a real aggregator is **only** an adapter
+ config + a passing contract test — **no business-logic changes**. This guide is
the checklist; the mock adapters (`src/vendors/mockVtu.ts`) are the reference
implementation of the contract.

## The framework you build against

| Concern | Where | Notes |
|---|---|---|
| Interface | `src/vendors/types.ts` → `VendorAdapter` | `purchase/verify/balance/health/listPlans` + `capabilities` |
| HTTP resilience | `src/lib/http/resilientHttp.ts` | timeout, retry, circuit breaker, metrics — **all calls must go through it** |
| Base class | `src/vendors/BaseVendorAdapter.ts` | template: you implement build/parse, it owns signing + resilience |
| Auth | `src/vendors/signing.ts` | `ApiKeyHeaderSigner`, `BearerTokenSigner`, `HmacBodySigner`, `CompositeSigner` |
| Secrets | `src/lib/vendors/secrets.ts` | env only: `VENDOR_<ID>_<KEY>`, never the DB |
| Errors | `src/vendors/errors.ts` | `VendorError(kind)` → `disposition`: fail / pending / escalate |
| Capabilities | `src/vendors/types.ts` + `capabilities.ts` | what the provider can do |
| Catalog mapping | `src/vendors/catalogNormalization.ts` | `normalizePlans(raw, fieldMap, defaults)`, `toMinor()` |
| Webhooks | `src/lib/webhooks/webhookFramework.ts` + `src/vendors/webhookVerification.ts` | verify → persist → idempotent process |
| Routing | `src/vendors/routing.ts` + `registry.ts` | health/float/cost/latency/state — automatic |
| Contract test | `src/vendors/adapterContract.ts` | every adapter must pass `runAdapterContract` |

## Invariants (do not violate)

- **Verify, never trust.** `purchase()`/webhook payloads are not authoritative — the
  reservation is only settled after the provider confirms delivery (`verify()` in
  recovery, or a synchronous delivered status you trust from the provider's own API).
- **Idempotency.** Send our `reference` (the transaction id) as the provider's
  idempotency key so retries never double-purchase. `verify()` must be keyed on a
  ref we persist.
- **Pending is not failure.** If the provider hasn't confirmed, return
  `status: "pending"` — the funds stay reserved and the recovery worker requeries.
  Never return `failed` for an indeterminate outcome (that would refund a delivered
  purchase).
- **Minor units, integers.** All amounts in kobo/cents; use `toMinor()` for decimals.

## Steps

1. **Collect from the official docs:** base URLs (sandbox + prod), auth scheme,
   purchase/verify/balance/catalog endpoints with request+response shapes, the field
   that maps to delivered/failed/**pending**, webhook signature scheme (algo +
   header + encoding), error/status codes, and sandbox credentials + test MSISDNs.

2. **Add secrets** to the environment (never the DB), e.g.
   `VENDOR_VTPASS_API_KEY=...`, `VENDOR_VTPASS_SECRET_KEY=...`. Read them with
   `getVendorSecret("vtpass", "api-key")`.

3. **Write the adapter** extending `BaseVendorAdapter`:
   ```ts
   class VtpassAdapter extends BaseVendorAdapter {
     constructor() {
       super({
         id: "vtpass",
         capabilities: { services: [...], supportsRequery: true, supportsWebhooks: true,
                         supportsBalance: true, supportsCatalog: true, deliveryMode: "async" },
         baseUrl: process.env.VENDOR_VTPASS_BASE_URL!,
         signer: new CompositeSigner([ new ApiKeyHeaderSigner("api-key", getVendorSecret("vtpass","api-key")), ... ]),
       });
     }
     protected buildPurchase(p)  { return { path: "/pay", body: { request_id: p.reference, ... } }; }
     protected parsePurchase(raw) { /* map provider status -> delivered|failed|pending; throw VendorError for auth/float */ }
     protected buildVerify(ref)   { return { path: "/requery", body: { request_id: ref } }; }
     protected parseVerify(raw)   { /* -> delivered|failed|pending */ }
     protected buildBalance()     { return { method: "GET", path: "/balance" }; }
     protected parseBalance(raw)  { return toMinor((raw as any).balance); }
     protected async healthCheck(){ try { await this.balance(); return true; } catch { return false; } }
     protected buildListPlans(st) { return { method: "GET", path: `/plans/${st}` }; }
     protected parsePlans(raw, st){ return normalizePlans((raw as any).plans, {...}, { currency: "NGN" }); }
   }
   ```

4. **Register** the adapter in `src/vendors/registry.ts` (`ADAPTERS`) and insert a
   `vendors` row (`id`, `kind='vtu'`, `priority`, `enabled`, `float_threshold_minor`,
   `cost_weight`). Routing, health checks and the ops dashboard pick it up
   automatically.

5. **Webhooks** (if supported): register a handler in
   `src/lib/webhooks/registerHandlers.ts` and, in the provider's webhook route, pass
   a `HmacWebhookVerifier({ secret, header, algo, encoding })`. The handler must call
   `verify()` before changing state — never trust the callback body.

6. **Catalog:** `listPlans()` returns `normalizePlans(...)`. The catalog sync
   pipeline handles pricing, margin protection and deactivation — do not set selling
   prices in the adapter (`priceMinor` stays 0; markup rules decide).

7. **Contract test:** add `src/vendors/<id>.contract.test.ts`:
   ```ts
   runAdapterContract("vtpass", new VtpassAdapter(), { serviceType: "airtime", makePurchaseParams, failedPhone });
   ```
   For live-endpoint assertions, gate them behind sandbox credentials (skip when the
   `VENDOR_<ID>_*` env is absent), like the other `*.integration.test.ts` files.

8. **Verify against sandbox**, then flip the `vendors` row live. Watch the ops
   dashboard (success/timeout rate, p95, float, circuit) before raising `priority`.

## eSIM providers (extra surface)

eSIM purchase/settlement uses the same VendorAdapter + reservation path
(`service_type: 'esim'`). eSIMs additionally have a post-issuance lifecycle
(activation + data usage), modelled by a separate abstraction so the reads swap
cleanly too:

| Concern | Where |
|---|---|
| Interface | `src/vendors/esim/types.ts` → `EsimProvider` (`getUsage`, `getActivation`) |
| Reference impl | `src/vendors/esim/mockEsim.ts` |
| Registry | `src/vendors/esim/registry.ts` → `getEsimProvider(vendorId)` |
| Activation (LPA/QR) | `src/vendors/esim/lpa.ts` (`ESIM_DEFAULT_SMDP` env) |
| Lifecycle records | `esims` table (migration 0028); `src/lib/esim/esimService.ts` |
| Contract test | `src/vendors/esim/esimContract.ts` → `runEsimProviderContract` |

To add a real eSIM provider: implement `EsimProvider` (route calls through the
shared resilience layer as with VTU), register it under the fulfilling vendor id,
and add a `*.contract.test.ts` calling `runEsimProviderContract`. The `esims`
lifecycle row is created lazily on first read (`ensureEsimForTxn`), so both
synchronously-delivered and recovery-settled eSIMs are captured without touching
the generic settlement code. `getUsage` returns raw usage; the service reconciles
it against the sold allowance (`esims.total_mb` from the catalog) and expiry to
derive status (issued → installed → active → depleted → expired).
