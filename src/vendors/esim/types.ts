// eSIM provider abstraction. eSIM purchase/settlement flows through the generic
// VendorAdapter + reservation lifecycle (service_type 'esim'); this interface
// adds the eSIM-specific READ operations a provider exposes after issuance:
// activation details and data usage. Providers are interchangeable behind it,
// exactly like VendorAdapter.

export type EsimStatus = "issued" | "installed" | "active" | "depleted" | "expired" | "revoked";

export interface EsimProvisionResult {
  iccid: string;
  status: "issued" | "pending"; // provisioning may be async
  smdpAddress?: string;
  matchingId?: string;
  activationCode?: string; // full LPA string, if the provider supplies one
  totalMb?: number;
  validityDays?: number;
  raw?: unknown;
}

export interface EsimUsage {
  iccid: string;
  status: EsimStatus;
  totalMb: number | null;
  usedMb: number;
  remainingMb: number | null;
  expiresAt: string | null;
  raw?: unknown;
}

export interface EsimActivation {
  iccid: string;
  smdpAddress: string;
  matchingId: string;
  lpaString: string; // LPA:1$<smdp>$<matchingId> — what the phone camera expects
  qrPayload: string; // QR contents (usually identical to lpaString)
}

export interface EsimCapabilities {
  supportsUsage: boolean; // exposes a data-usage endpoint
  supportsActivationFetch: boolean; // can (re)fetch activation details post-issuance
  provisioningMode: "sync" | "async"; // whether the ICCID is returned immediately
}

export interface EsimProvider {
  id: string; // matches the fulfilling vendor id
  capabilities: EsimCapabilities;
  // Current data usage + lifecycle status for an issued eSIM.
  getUsage(iccid: string): Promise<EsimUsage>;
  // Activation details (LPA/QR) for installing the profile.
  getActivation(iccid: string): Promise<EsimActivation>;
}
