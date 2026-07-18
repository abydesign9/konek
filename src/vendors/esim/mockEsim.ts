import { EsimActivation, EsimProvider, EsimUsage } from "./types";
import { defaultSmdpAddress, lpaQrPayload, lpaString } from "./lpa";

// Reference eSIM provider. Deterministic so demos/tests are predictable, but
// shaped exactly like a real eSIM management API so the service layer needs no
// changes when a live provider (Airalo / eSIM Access / Maya …) is wired in.

function hash(s: string): number {
  return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function buildMockEsimProvider(id: string): EsimProvider {
  return {
    id,
    capabilities: { supportsUsage: true, supportsActivationFetch: true, provisioningMode: "sync" },

    async getUsage(iccid: string): Promise<EsimUsage> {
      // Deterministic "used" figure; total/expiry are reconciled against the
      // esims row (the allowance we actually sold) by the service layer.
      const usedMb = hash(iccid) % 5000;
      return {
        iccid,
        status: "active",
        totalMb: null,
        usedMb,
        remainingMb: null,
        expiresAt: null,
        raw: { source: "mock", iccid },
      };
    },

    async getActivation(iccid: string): Promise<EsimActivation> {
      const smdpAddress = defaultSmdpAddress();
      const matchingId = iccid; // real providers return a distinct matching id
      return {
        iccid,
        smdpAddress,
        matchingId,
        lpaString: lpaString(smdpAddress, matchingId),
        qrPayload: lpaQrPayload(smdpAddress, matchingId),
      };
    },
  };
}

export const mockEsimProvider = buildMockEsimProvider("mock_vtu");
export const mockEsimProvider2 = buildMockEsimProvider("mock_vtu_2");
