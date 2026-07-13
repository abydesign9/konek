import {
  PurchaseParams,
  PurchaseResult,
  VendorAdapter,
  VendorPlan,
  VerifyResult,
} from "./types";

const NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

const DATA_PLANS: VendorPlan[] = NETWORKS.flatMap((network) => [
  {
    externalId: `${network}-1gb-30d`,
    name: "1GB — 30 days",
    network,
    costMinor: 30000,
    priceMinor: 35000,
    currency: "NGN",
  },
  {
    externalId: `${network}-2gb-30d`,
    name: "2GB — 30 days",
    network,
    costMinor: 55000,
    priceMinor: 60000,
    currency: "NGN",
  },
  {
    externalId: `${network}-5gb-30d`,
    name: "5GB — 30 days",
    network,
    costMinor: 130000,
    priceMinor: 140000,
    currency: "NGN",
  },
]);

const failedRefs = new Set<string>();

// Sandbox stand-in for a real VTU aggregator (Reloadly / VTU.ng). Always
// "delivers" unless the phone number ends in 0000, so failure paths are
// exercisable in dev without a live vendor.
export const mockVtuAdapter: VendorAdapter = {
  id: "mock_vtu",

  async purchase(params: PurchaseParams): Promise<PurchaseResult> {
    const vendorRef = `mockvtu_${params.reference}`;
    const willFail = params.phone?.endsWith("0000") ?? false;

    if (willFail) {
      failedRefs.add(vendorRef);
      return { vendorRef, status: "failed", raw: { reason: "simulated vendor decline" } };
    }

    return {
      vendorRef,
      status: "delivered",
      raw: { network: params.network, phone: params.phone, planExternalId: params.planExternalId },
    };
  },

  async verify(vendorRef: string): Promise<VerifyResult> {
    return { status: failedRefs.has(vendorRef) ? "failed" : "delivered" };
  },

  async balance(): Promise<number> {
    return 500000000; // ₦5,000,000 mock float
  },

  async health(): Promise<boolean> {
    return true;
  },

  async listPlans(serviceType) {
    return serviceType === "data" ? DATA_PLANS : [];
  },
};
