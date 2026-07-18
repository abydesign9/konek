import { runEsimProviderContract } from "./esimContract";
import { mockEsimProvider, mockEsimProvider2 } from "./mockEsim";

// The mock eSIM providers are the reference implementation — they must satisfy
// the same contract every real eSIM provider will.
runEsimProviderContract("mock_vtu (esim)", mockEsimProvider, "ICCID-8991000000000001");
runEsimProviderContract("mock_vtu_2 (esim)", mockEsimProvider2, "ICCID-8991000000000002");
