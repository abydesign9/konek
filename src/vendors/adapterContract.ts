import { describe, it, expect } from "vitest";
import { PurchaseParams, VendorAdapter, VendorServiceType } from "./types";
import { supportsService } from "./capabilities";

// Reusable conformance suite. Every VendorAdapter — mock or real — must pass
// this. A per-adapter *.contract.test.ts file calls runAdapterContract(...).
// It asserts the interface semantics the platform relies on; it does NOT assume
// any provider-specific endpoints or payloads.

export interface ContractOptions {
  serviceType: VendorServiceType;
  makePurchaseParams: (overrides?: Partial<PurchaseParams>) => PurchaseParams;
  failedPhone?: string; // an input the impl is known to decline (optional)
}

export function runAdapterContract(name: string, adapter: VendorAdapter, opts: ContractOptions): void {
  describe(`VendorAdapter contract: ${name}`, () => {
    it("declares well-formed capabilities", () => {
      expect(Array.isArray(adapter.capabilities.services)).toBe(true);
      expect(typeof adapter.capabilities.supportsRequery).toBe("boolean");
      expect(typeof adapter.capabilities.supportsBalance).toBe("boolean");
      expect(typeof adapter.capabilities.supportsCatalog).toBe("boolean");
      expect(["sync", "async", "mixed"]).toContain(adapter.capabilities.deliveryMode);
    });

    it("supports the service type it will be asked to fulfil", () => {
      expect(supportsService(adapter.capabilities, opts.serviceType)).toBe(true);
    });

    it("purchase returns a valid PurchaseResult", async () => {
      const r = await adapter.purchase(opts.makePurchaseParams());
      expect(typeof r.vendorRef).toBe("string");
      expect(r.vendorRef.length).toBeGreaterThan(0);
      expect(["delivered", "failed", "pending"]).toContain(r.status);
    });

    it("derives a deterministic vendorRef from our reference (idempotency-friendly)", async () => {
      const params = opts.makePurchaseParams({ reference: "contract-ref-1" });
      const a = await adapter.purchase(params);
      const b = await adapter.purchase(params);
      expect(a.vendorRef).toBe(b.vendorRef);
    });

    it("verify returns a known status when requery is supported", async () => {
      if (!adapter.capabilities.supportsRequery) return;
      const p = await adapter.purchase(opts.makePurchaseParams({ reference: "contract-ref-2" }));
      const v = await adapter.verify(p.vendorRef);
      expect(["delivered", "failed", "pending"]).toContain(v.status);
    });

    it("health returns a boolean", async () => {
      expect(typeof (await adapter.health())).toBe("boolean");
    });

    it("balance returns a non-negative integer when supported", async () => {
      if (!adapter.capabilities.supportsBalance) return;
      const b = await adapter.balance();
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
    });

    it("listPlans returns normalized plans when catalog is supported", async () => {
      if (!adapter.capabilities.supportsCatalog || !adapter.listPlans) return;
      const plans = await adapter.listPlans(opts.serviceType);
      expect(Array.isArray(plans)).toBe(true);
      for (const pl of plans) {
        expect(typeof pl.externalId).toBe("string");
        expect(Number.isInteger(pl.costMinor)).toBe(true);
        expect(pl.costMinor).toBeGreaterThanOrEqual(0);
        expect(typeof pl.currency).toBe("string");
      }
    });

    it("reflects a declined input as failed when a decline trigger is provided", async () => {
      if (!opts.failedPhone) return;
      const r = await adapter.purchase(opts.makePurchaseParams({ reference: "contract-ref-3", phone: opts.failedPhone }));
      expect(r.status).toBe("failed");
    });
  });
}
