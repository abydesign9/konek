import { ProviderCapabilities, VendorServiceType } from "./types";

// Helpers for reasoning about provider capabilities (the interface itself lives
// in types.ts to avoid an import cycle).

export function supportsService(cap: ProviderCapabilities, serviceType: VendorServiceType): boolean {
  return cap.services.includes(serviceType);
}

// A conservative default a new adapter can spread over: declares nothing until
// the integrator explicitly opts in, so an unimplemented capability is never
// silently assumed present.
export const NO_CAPABILITIES: ProviderCapabilities = {
  services: [],
  supportsRequery: false,
  supportsWebhooks: false,
  supportsBalance: false,
  supportsCatalog: false,
  deliveryMode: "sync",
};
