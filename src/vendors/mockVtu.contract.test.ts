import { runAdapterContract } from "./adapterContract";
import { mockVtuAdapter, mockVtuAdapter2 } from "./mockVtu";
import { PurchaseParams } from "./types";

// The mock adapters are the reference implementation of the VendorAdapter
// contract — they must pass the same conformance suite every real adapter will.
function params(overrides: Partial<PurchaseParams> = {}): PurchaseParams {
  return {
    reference: "ref-" + Math.random().toString(36).slice(2),
    serviceType: "airtime",
    network: "mtn",
    phone: "08031234567", // delivers in the mock (does not end in 0000/9999)
    amountMinor: 10000,
    ...overrides,
  };
}

runAdapterContract("mock_vtu", mockVtuAdapter, {
  serviceType: "airtime",
  makePurchaseParams: params,
  failedPhone: "08030000", // ends in 0000 -> mock declines
});

runAdapterContract("mock_vtu_2", mockVtuAdapter2, {
  serviceType: "data",
  makePurchaseParams: (o) => params({ serviceType: "data", planExternalId: "mtn-1gb-30d", ...o }),
  failedPhone: "08030000",
});
