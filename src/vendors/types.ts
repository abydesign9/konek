export type VendorServiceType =
  | "airtime"
  | "data"
  | "cable"
  | "electricity"
  | "exam_pin"
  | "betting"
  | "intl_topup"
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

// Every VTU aggregator implements this — routing between aggregators is a
// registry/priority lookup (see registry.ts), never an inline vendor choice.
export interface VendorAdapter {
  id: string; // matches vendors.id in the DB
  purchase(params: PurchaseParams): Promise<PurchaseResult>;
  verify(vendorRef: string): Promise<VerifyResult>;
  balance(): Promise<number>;
  health(): Promise<boolean>;
  listPlans?(serviceType: VendorServiceType): Promise<VendorPlan[]>;
}
