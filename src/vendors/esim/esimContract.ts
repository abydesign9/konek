import { describe, it, expect } from "vitest";
import { EsimProvider } from "./types";

// Conformance suite every EsimProvider (mock or real) must pass. No provider
// specifics — asserts the interface semantics the eSIM service relies on.
export function runEsimProviderContract(name: string, provider: EsimProvider, sampleIccid: string): void {
  describe(`EsimProvider contract: ${name}`, () => {
    it("declares well-formed capabilities", () => {
      expect(typeof provider.capabilities.supportsUsage).toBe("boolean");
      expect(typeof provider.capabilities.supportsActivationFetch).toBe("boolean");
      expect(["sync", "async"]).toContain(provider.capabilities.provisioningMode);
    });

    it("getUsage returns a valid usage shape", async () => {
      if (!provider.capabilities.supportsUsage) return;
      const u = await provider.getUsage(sampleIccid);
      expect(u.iccid).toBe(sampleIccid);
      expect(u.usedMb).toBeGreaterThanOrEqual(0);
      expect(["issued", "installed", "active", "depleted", "expired", "revoked"]).toContain(u.status);
    });

    it("getActivation returns a valid LPA activation", async () => {
      if (!provider.capabilities.supportsActivationFetch) return;
      const a = await provider.getActivation(sampleIccid);
      expect(a.smdpAddress.length).toBeGreaterThan(0);
      expect(a.matchingId.length).toBeGreaterThan(0);
      expect(a.lpaString.startsWith("LPA:1$")).toBe(true);
      expect(a.lpaString).toContain(a.smdpAddress);
      expect(a.lpaString).toContain(a.matchingId);
      expect(a.qrPayload).toBe(a.lpaString);
    });
  });
}
