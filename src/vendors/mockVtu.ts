import {
  PurchaseParams,
  PurchaseResult,
  VendorAdapter,
  VendorPlan,
  VerifyResult,
} from "./types";

const NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

const DATA_PLANS: VendorPlan[] = NETWORKS.flatMap((network) => [
  { externalId: `${network}-1gb-30d`, name: "1GB — 30 days", network, costMinor: 30000, priceMinor: 35000, currency: "NGN" },
  { externalId: `${network}-2gb-30d`, name: "2GB — 30 days", network, costMinor: 55000, priceMinor: 60000, currency: "NGN" },
  { externalId: `${network}-5gb-30d`, name: "5GB — 30 days", network, costMinor: 130000, priceMinor: 140000, currency: "NGN" },
]);

const CABLE_PLANS: VendorPlan[] = [
  { externalId: "dstv-padi", name: "DStv Padi", network: "dstv", costMinor: 250000, priceMinor: 265000, currency: "NGN" },
  { externalId: "dstv-compact", name: "DStv Compact", network: "dstv", costMinor: 950000, priceMinor: 990000, currency: "NGN" },
  { externalId: "gotv-max", name: "GOtv Max", network: "gotv", costMinor: 620000, priceMinor: 650000, currency: "NGN" },
  { externalId: "startimes-basic", name: "StarTimes Basic", network: "startimes", costMinor: 180000, priceMinor: 190000, currency: "NGN" },
];

const EXAM_PLANS: VendorPlan[] = [
  { externalId: "waec-pin", name: "WAEC result checker PIN", network: "waec", costMinor: 340000, priceMinor: 360000, currency: "NGN" },
  { externalId: "neco-pin", name: "NECO result checker PIN", network: "neco", costMinor: 90000, priceMinor: 100000, currency: "NGN" },
  { externalId: "jamb-pin", name: "JAMB ePIN", network: "jamb", costMinor: 480000, priceMinor: 500000, currency: "NGN" },
];

const ESIM_PLANS: VendorPlan[] = [
  { externalId: "us-3gb-7d", name: "USA — 3GB / 7 days", network: "us", costMinor: 900, priceMinor: 1000, currency: "USD" },
  { externalId: "uk-5gb-15d", name: "UK — 5GB / 15 days", network: "uk", costMinor: 1400, priceMinor: 1500, currency: "USD" },
  { externalId: "eu-10gb-30d", name: "Europe — 10GB / 30 days", network: "eu", costMinor: 2200, priceMinor: 2400, currency: "USD" },
];

function randomToken(prefix: string, digits = 16): string {
  let out = "";
  for (let i = 0; i < digits; i++) out += Math.floor(Math.random() * 10);
  return `${prefix}${out}`;
}

function buildMockAdapter(id: string): VendorAdapter {
  const failedRefs = new Set<string>();

  return {
    id,

    async purchase(params: PurchaseParams): Promise<PurchaseResult> {
      const vendorRef = `${id}_${params.reference}`;
      const willFail = params.phone?.endsWith("0000") ?? false;

      if (willFail) {
        failedRefs.add(vendorRef);
        return { vendorRef, status: "failed", raw: { reason: "simulated vendor decline" } };
      }

      let token: string | undefined;
      if (params.serviceType === "electricity") token = randomToken("", 20);
      if (params.serviceType === "exam_pin") token = randomToken("PIN-", 12);
      if (params.serviceType === "esim") token = randomToken("ICCID-", 18);

      return {
        vendorRef,
        status: "delivered",
        token,
        raw: {
          network: params.network,
          phone: params.phone,
          planExternalId: params.planExternalId,
          vendor: id,
        },
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
      switch (serviceType) {
        case "data":
          return DATA_PLANS;
        case "cable":
          return CABLE_PLANS;
        case "exam_pin":
          return EXAM_PLANS;
        case "esim":
          return ESIM_PLANS;
        default:
          return [];
      }
    },
  };
}

// Two independent sandbox vendors so registry failover (priority + health)
// is actually exercisable in dev without live aggregator credentials.
export const mockVtuAdapter = buildMockAdapter("mock_vtu");
export const mockVtuAdapter2 = buildMockAdapter("mock_vtu_2");
