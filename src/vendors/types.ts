export type VendorServiceType =
  | "airtime"
  | "data"
  | "cable"
  | "electricity"
  | "exam_pin"
  | "betting"
  | "gift_card"
  | "intl_topup"
  | "intl_data"
  | "router_mifi"
  | "esim";

export interface PurchaseParams {
  reference: string; // our transaction id — vendor should treat this as idempotency key too
  serviceType: VendorServiceType;
  network?: string; // mtn|glo|airtel|9mobile for VTU; disco/provider/country id for others
  phone?: string; // subscriber phone, or meter/smartcard number depending on service type
  planExternalId?: string; // for data bundles / catalog-based purchases
  amountMinor: number; // always the currency actually charged (see currency)
  currency?: string; // defaults to NGN
}

export type VendorTxnStatus = "delivered" | "failed" | "pending";

export interface PurchaseResult {
  vendorRef: string;
  status: VendorTxnStatus;
  token?: string; // electricity token / epin, when applicable
  raw?: unknown;
}

export interface VerifyResult {
  status: VendorTxnStatus;
  raw?: unknown;
}

export interface VendorPlan {
  externalId: string;
  name: string;
  network: string;
  costMinor: number;
  priceMinor: number;
  currency: string;
  meta?: Record<string, unknown>;
}

// Declares what a provider can actually do, so routing/recovery/observability
// can reason about it without provider-specific knowledge (e.g. only route a
// service type the provider supports; only rely on recovery when it can requery).
export interface ProviderCapabilities {
  services: VendorServiceType[]; // service types this provider can fulfil
  supportsRequery: boolean; // has a verify()/requery endpoint (reservation recovery needs this)
  supportsWebhooks: boolean; // pushes delivery callbacks
  supportsBalance: boolean; // exposes a float balance
  supportsCatalog: boolean; // exposes a plan catalog via listPlans()
  deliveryMode: "sync" | "async" | "mixed"; // whether purchase() returns a final status or may be pending
}

// Every VTU aggregator implements this — routing between aggregators is a
// registry/priority lookup (see registry.ts), never an inline vendor choice.
export interface VendorAdapter {
  id: string; // matches vendors.id in the DB
  capabilities: ProviderCapabilities;
  purchase(params: PurchaseParams): Promise<PurchaseResult>;
  verify(vendorRef: string): Promise<VerifyResult>;
  balance(): Promise<number>;
  health(): Promise<boolean>;
  listPlans?(serviceType: VendorServiceType): Promise<VendorPlan[]>;
}
