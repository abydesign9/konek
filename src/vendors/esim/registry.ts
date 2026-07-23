import { EsimProvider } from "./types";
import { mockEsimProvider, mockEsimProvider2 } from "./mockEsim";
import { esimAccessProvider, isEsimAccessConfigured } from "./esimAccess";

// eSIM providers keyed by fulfilling vendor id (same id space as the VTU
// registry). The service layer looks one up by the provider recorded on the
// esims row, so the mocks stay registered for historical/mock-issued eSIMs even
// once the real provider is live.
const ESIM_PROVIDERS: Record<string, EsimProvider> = {
  [mockEsimProvider.id]: mockEsimProvider,
  [mockEsimProvider2.id]: mockEsimProvider2,
  // Real provider — only registered when credentials are present, so a missing
  // key can never silently swallow eSIM reads.
  ...(isEsimAccessConfigured() ? { [esimAccessProvider.id]: esimAccessProvider } : {}),
};

export function getEsimProvider(id: string): EsimProvider | undefined {
  return ESIM_PROVIDERS[id];
}
