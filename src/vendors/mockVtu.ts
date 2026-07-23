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

// Gift cards are foreign-brand digital codes priced in USD (charged in NGN via
// FX at purchase time, same as eSIM/intl top-up). You BUY a code — Konek never
// buys cards back for cash (that would be the airtime-to-cash model it avoids).
const GIFTCARD_BRANDS = [
  { network: "amazon", name: "Amazon" },
  { network: "steam", name: "Steam" },
  { network: "googleplay", name: "Google Play" },
  { network: "itunes", name: "iTunes" },
  { network: "netflix", name: "Netflix" },
];
const GIFTCARD_DENOMS_USD = [10, 25, 50, 100];
const GIFTCARD_PLANS: VendorPlan[] = GIFTCARD_BRANDS.flatMap((b) =>
  GIFTCARD_DENOMS_USD.map((usd) => ({
    externalId: `${b.network}-${usd}`,
    name: `${b.name} $${usd}`,
    network: b.network,
    costMinor: usd * 100 - 40, // small wholesale margin
    priceMinor: usd * 100,
    currency: "USD",
  }))
);

// eSIM packs across the three PRD tiers: single-country, regional, and
// global. meta carries the machine-readable pack type + data allowance +
// validity so the UI can group them and the usage meter can show the real
// plan size. USD-priced, charged in NGN via FX at purchase time.
interface EsimSpec {
  network: string; // pack id
  label: string; // human place/region name
  type: "country" | "region" | "global";
  flag: string;
  dataGb: number;
  days: number;
  priceUsd: number;
}
const ESIM_SPECS: EsimSpec[] = [
  // Country
  { network: "us", label: "United States", type: "country", flag: "🇺🇸", dataGb: 1, days: 7, priceUsd: 4.5 },
  { network: "us", label: "United States", type: "country", flag: "🇺🇸", dataGb: 3, days: 15, priceUsd: 9 },
  { network: "us", label: "United States", type: "country", flag: "🇺🇸", dataGb: 5, days: 30, priceUsd: 14 },
  { network: "uk", label: "United Kingdom", type: "country", flag: "🇬🇧", dataGb: 3, days: 15, priceUsd: 9 },
  { network: "uk", label: "United Kingdom", type: "country", flag: "🇬🇧", dataGb: 10, days: 30, priceUsd: 19 },
  { network: "ae", label: "United Arab Emirates", type: "country", flag: "🇦🇪", dataGb: 5, days: 15, priceUsd: 17 },
  { network: "tr", label: "Türkiye", type: "country", flag: "🇹🇷", dataGb: 3, days: 15, priceUsd: 10 },
  { network: "ng", label: "Nigeria", type: "country", flag: "🇳🇬", dataGb: 5, days: 30, priceUsd: 12 },
  // Region
  { network: "eu-region", label: "Europe (36 countries)", type: "region", flag: "🇪🇺", dataGb: 10, days: 30, priceUsd: 24 },
  { network: "asia-region", label: "Asia (14 countries)", type: "region", flag: "🌏", dataGb: 10, days: 30, priceUsd: 29 },
  { network: "africa-region", label: "Africa (18 countries)", type: "region", flag: "🌍", dataGb: 5, days: 30, priceUsd: 27 },
  { network: "americas-region", label: "Americas (15 countries)", type: "region", flag: "🌎", dataGb: 8, days: 30, priceUsd: 26 },
  // Global
  { network: "global", label: "Global (120+ countries)", type: "global", flag: "🌐", dataGb: 5, days: 30, priceUsd: 35 },
  { network: "global", label: "Global (120+ countries)", type: "global", flag: "🌐", dataGb: 10, days: 60, priceUsd: 59 },
];
const ESIM_PLANS: VendorPlan[] = ESIM_SPECS.map((s) => ({
  externalId: `${s.network}-${s.dataGb}gb-${s.days}d`,
  name: `${s.label} — ${s.dataGb}GB / ${s.days} days`,
  network: s.network,
  costMinor: Math.round(s.priceUsd * 100) - 60,
  priceMinor: Math.round(s.priceUsd * 100),
  currency: "USD",
  meta: { type: s.type, dataMb: s.dataGb * 1000, validityDays: s.days, flag: s.flag, place: s.label },
}));

function randomToken(prefix: string, digits = 16): string {
  let out = "";
  for (let i = 0; i < digits; i++) out += Math.floor(Math.random() * 10);
  return `${prefix}${out}`;
}

function buildMockAdapter(id: string): VendorAdapter {
  const failedRefs = new Set<string>();

  return {
    id,

    // Reference capability declaration: this mock stands in for a full-featured
    // VTU aggregator (all local service types, requery + balance + catalog).
    capabilities: {
      services: [
        "airtime",
        "data",
        "cable",
        "electricity",
        "exam_pin",
        "betting",
        "gift_card",
        "intl_topup",
        "intl_data",
        "router_mifi",
        "esim",
      ],
      supportsRequery: true,
      supportsWebhooks: false,
      supportsBalance: true,
      supportsCatalog: true,
      deliveryMode: "mixed", // delivered/failed synchronously; 'pending' when a phone ends in 9999
    },

    async purchase(params: PurchaseParams): Promise<PurchaseResult> {
      const vendorRef = `${id}_${params.reference}`;
      const willFail = params.phone?.endsWith("0000") ?? false;
      // Simulates an async aggregator that acknowledges but hasn't confirmed
      // delivery yet — the reservation must stay held until verify() resolves it.
      const willPend = params.phone?.endsWith("9999") ?? false;

      if (willFail) {
        failedRefs.add(vendorRef);
        return { vendorRef, status: "failed", raw: { reason: "simulated vendor decline" } };
      }

      if (willPend) {
        return { vendorRef, status: "pending", raw: { reason: "awaiting vendor confirmation" } };
      }

      let token: string | undefined;
      if (params.serviceType === "electricity") token = randomToken("", 20);
      if (params.serviceType === "exam_pin") token = randomToken("PIN-", 12);
      if (params.serviceType === "esim") token = randomToken("ICCID-", 18);
      if (params.serviceType === "gift_card") token = randomToken("GC-", 16);

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
        case "gift_card":
          return GIFTCARD_PLANS;
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
