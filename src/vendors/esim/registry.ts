import { EsimProvider } from "./types";
import { mockEsimProvider, mockEsimProvider2 } from "./mockEsim";

// eSIM providers keyed by fulfilling vendor id (same id space as the VTU
// registry). Add real providers here as they're wired up; the service layer
// looks one up by the provider recorded on the esims row.
const ESIM_PROVIDERS: Record<string, EsimProvider> = {
  [mockEsimProvider.id]: mockEsimProvider,
  [mockEsimProvider2.id]: mockEsimProvider2,
};

export function getEsimProvider(id: string): EsimProvider | undefined {
  return ESIM_PROVIDERS[id];
}
