import crypto from "node:crypto";
import { resilientRequest } from "@/lib/http/resilientHttp";
import type {
  PurchaseParams,
  PurchaseResult,
  VendorAdapter,
  VendorPlan,
  VendorServiceType,
  VerifyResult,
} from "@/vendors/types";
import type { EsimActivation, EsimProvider, EsimStatus, EsimUsage } from "./types";
import { lpaQrPayload } from "./lpa";

// Real eSIM provider: eSIM Access (RedTea Mobile) — https://api.esimaccess.com
//
// Two surfaces, both driven by the same HTTP client:
//   * VendorAdapter  — the purchase path (service_type 'esim'): order, verify,
//     balance, health, catalog. Ordering is ASYNC: /esim/order returns an
//     orderNo and the SM-DP+ allocates profiles afterwards, so purchase()
//     returns `pending` and verify(orderNo) settles it once profiles exist
//     (their error 200010 explicitly means "still allocating").
//   * EsimProvider   — post-issuance reads (usage + activation/LPA) keyed by ICCID.
//
// Credentials come from env only (never committed). HMAC signing is implemented
// per their spec but OFF by default, because their documented quick-start
// authenticates with the RT-AccessCode header alone; flip ESIM_ACCESS_SIGN=true
// if your account enforces signatures.
export const ESIM_ACCESS_ID = "esim_access";

const DEFAULT_BASE = "https://api.esimaccess.com";

function baseUrl(): string {
  return (process.env.ESIM_ACCESS_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

export function isEsimAccessConfigured(): boolean {
  return !!process.env.ESIM_ACCESS_ACCESS_CODE;
}

// Their money unit is value * 10,000 (10000 = $1.00). Our catalog stores USD
// minor units (cents), so cents = value / 100.
function toUsdCents(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n / 100) : 0;
}

function bytesToMb(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n / (1024 * 1024)) : 0;
}

interface EsimAccessEnvelope<T> {
  success: boolean;
  errorCode: string | null;
  errorMsg?: string | null;
  errorMessage?: string | null;
  obj: T | null;
}

export class EsimAccessError extends Error {
  constructor(public code: string | null, message: string) {
    super(message);
    this.name = "EsimAccessError";
  }
}

// Every endpoint is POST + JSON, authenticated by RT-AccessCode (plus optional
// HMAC-SHA256 signature over timestamp + requestId + accessCode + body).
async function call<T>(
  path: string,
  body: Record<string, unknown>,
  operation: "purchase" | "verify" | "balance" | "health" | "catalog" | "other"
): Promise<T> {
  const accessCode = process.env.ESIM_ACCESS_ACCESS_CODE;
  if (!accessCode) throw new EsimAccessError(null, "ESIM_ACCESS_ACCESS_CODE is not set");

  const payload = JSON.stringify(body ?? {});
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "RT-AccessCode": accessCode,
  };

  if (process.env.ESIM_ACCESS_SIGN === "true") {
    const secret = process.env.ESIM_ACCESS_SECRET_KEY ?? "";
    const timestamp = String(Date.now());
    const requestId = crypto.randomUUID().replace(/-/g, "");
    const signStr = `${timestamp}${requestId}${accessCode}${payload}`;
    headers["RT-Timestamp"] = timestamp;
    headers["RT-RequestID"] = requestId;
    headers["RT-Signature"] = crypto.createHmac("sha256", secret).update(signStr).digest("hex").toLowerCase();
  }

  const res = await resilientRequest({
    provider: ESIM_ACCESS_ID,
    operation,
    url: `${baseUrl()}${path}`,
    method: "POST",
    headers,
    body: payload,
    timeoutMs: 20_000,
  });

  const json = res.json<EsimAccessEnvelope<T>>();
  if (!json?.success) {
    throw new EsimAccessError(json?.errorCode ?? null, json?.errorMsg || json?.errorMessage || "eSIM Access request failed");
  }
  return (json.obj ?? {}) as T;
}

// ---------------- Types for the bits of their payloads we use ----------------

interface AccessPackage {
  packageCode: string;
  slug?: string;
  name: string;
  price: number;
  retailPrice?: number;
  currencyCode: string;
  volume: number;
  duration: number;
  durationUnit: string;
  location: string;
  description?: string;
  speed?: string;
  locationNetworkList?: { locationName?: string; locationLogo?: string }[];
}

interface AccessEsim {
  esimTranNo: string;
  orderNo: string;
  iccid?: string;
  ac?: string;
  qrCodeUrl?: string;
  smdpStatus?: string;
  esimStatus?: string;
  expiredTime?: string | null;
  totalVolume?: number;
  orderUsage?: number;
  totalDuration?: number;
  durationUnit?: string;
}

// A region/global pack has a multi-country `location` list; a single code is a
// country pack. Drives the Country / Region / Global tabs on the buy screen.
function packType(location: string): "country" | "region" | "global" {
  if (!location) return "global";
  const parts = location.split(",").filter(Boolean);
  if (parts.length === 1) return "country";
  return parts.length > 12 ? "global" : "region";
}

async function queryEsims(body: Record<string, unknown>): Promise<AccessEsim[]> {
  const obj = await call<{ esimList?: AccessEsim[] }>(
    "/api/v1/open/esim/query",
    { pager: { pageNum: 1, pageSize: 50 }, ...body },
    "verify"
  );
  return obj.esimList ?? [];
}

// ---------------- VendorAdapter (purchase path) ----------------

export const esimAccessAdapter: VendorAdapter = {
  id: ESIM_ACCESS_ID,

  capabilities: {
    services: ["esim"],
    supportsRequery: true,
    supportsWebhooks: true, // ORDER_STATUS / SMDP_EVENT webhooks available
    supportsBalance: true,
    supportsCatalog: true,
    deliveryMode: "async",
  },

  async purchase(params: PurchaseParams): Promise<PurchaseResult> {
    if (!params.planExternalId) {
      return { vendorRef: "", status: "failed", raw: { reason: "planExternalId required for eSIM" } };
    }

    // transactionId is OUR transaction id: they treat a repeat of the same id as
    // the same request, which makes retries naturally idempotent.
    // price/amount are deliberately omitted so their current pricing applies —
    // sending a stale price returns 200005/200006.
    const order = await call<{ orderNo?: string }>(
      "/api/v1/open/esim/order",
      {
        transactionId: params.reference.slice(0, 50),
        packageInfoList: [{ packageCode: params.planExternalId, count: 1 }],
      },
      "purchase"
    );

    const orderNo = order.orderNo;
    if (!orderNo) return { vendorRef: "", status: "failed", raw: order };

    // Profiles allocate asynchronously — try once, then let verify()/recovery
    // settle it rather than blocking the request for up to 30s.
    try {
      const esims = await queryEsims({ orderNo });
      const ready = esims.find((e) => e.ac);
      if (ready) {
        return { vendorRef: orderNo, status: "delivered", token: ready.ac, raw: ready };
      }
    } catch (err) {
      // 200010 = SM-DP+ still allocating; anything else we also treat as pending
      // because the order itself succeeded and money must not be released.
      if (!(err instanceof EsimAccessError)) throw err;
    }

    return { vendorRef: orderNo, status: "pending", raw: order };
  },

  async verify(vendorRef: string): Promise<VerifyResult> {
    try {
      const esims = await queryEsims({ orderNo: vendorRef });
      const ready = esims.find((e) => e.ac);
      if (ready) return { status: "delivered", raw: ready };
      // Order exists but no profile yet.
      return { status: "pending", raw: { orderNo: vendorRef, count: esims.length } };
    } catch (err) {
      if (err instanceof EsimAccessError) {
        if (err.code === "200010") return { status: "pending", raw: { code: err.code } };
        // Unknown order — nothing was provisioned.
        if (err.code === "310272") return { status: "failed", raw: { code: err.code } };
        return { status: "pending", raw: { code: err.code, message: err.message } };
      }
      throw err;
    }
  },

  async balance(): Promise<number> {
    const obj = await call<Record<string, unknown>>("/api/v1/open/balance/query", {}, "balance");
    // Their balance field naming isn't pinned in the docs excerpt — accept the
    // common shapes and fall back to 0 rather than throwing on a read.
    const raw = obj.balance ?? obj.amount ?? obj.availableBalance ?? 0;
    return toUsdCents(raw);
  },

  async health(): Promise<boolean> {
    try {
      await call("/api/v1/open/balance/query", {}, "health");
      return true;
    } catch {
      return false;
    }
  },

  async listPlans(serviceType: VendorServiceType): Promise<VendorPlan[]> {
    if (serviceType !== "esim") return [];
    const obj = await call<{ packageList?: AccessPackage[] }>(
      "/api/v1/open/package/list",
      { locationCode: "", type: "BASE" },
      "catalog"
    );

    return (obj.packageList ?? []).map((p) => {
      const cost = toUsdCents(p.price);
      // Sell at their suggested retail when it's higher than cost, else a 20% markup.
      const retail = toUsdCents(p.retailPrice ?? 0);
      const price = retail > cost ? retail : Math.ceil(cost * 1.2);
      const place = p.locationNetworkList?.[0]?.locationName ?? p.description ?? p.location;

      return {
        externalId: p.slug || p.packageCode,
        name: p.name,
        network: p.location.split(",")[0] ?? p.location,
        costMinor: cost,
        priceMinor: price,
        currency: p.currencyCode || "USD",
        meta: {
          type: packType(p.location),
          dataMb: bytesToMb(p.volume),
          validityDays: p.duration,
          durationUnit: p.durationUnit,
          place,
          speed: p.speed,
          location: p.location,
          packageCode: p.packageCode,
        },
      };
    });
  },
};

// ---------------- EsimProvider (post-issuance reads) ----------------

function mapStatus(esimStatus?: string, smdpStatus?: string): EsimStatus {
  switch (esimStatus) {
    case "IN_USE":
      return "active";
    case "USED_UP":
      return "depleted";
    case "UNUSED_EXPIRED":
    case "USED_EXPIRED":
      return "expired";
    case "CANCEL":
    case "REVOKE":
      return "revoked";
    case "GOT_RESOURCE":
      return smdpStatus === "RELEASED" ? "issued" : "installed";
    default:
      return "issued";
  }
}

// "LPA:1$rsp-eu.redteamobile.com$451F98..." -> { smdp, matchingId }
function parseLpa(ac: string | undefined): { smdp: string; matchingId: string } {
  const parts = (ac ?? "").split("$");
  return { smdp: parts[1] ?? "", matchingId: parts[2] ?? "" };
}

async function findByIccid(iccid: string): Promise<AccessEsim | null> {
  const esims = await queryEsims({ iccid });
  return esims[0] ?? null;
}

export const esimAccessProvider: EsimProvider = {
  id: ESIM_ACCESS_ID,
  capabilities: { supportsUsage: true, supportsActivationFetch: true, provisioningMode: "async" },

  async getUsage(iccid: string): Promise<EsimUsage> {
    const e = await findByIccid(iccid);
    if (!e) {
      return { iccid, status: "issued", totalMb: null, usedMb: 0, remainingMb: null, expiresAt: null };
    }
    const totalMb = e.totalVolume ? bytesToMb(e.totalVolume) : null;
    const usedMb = bytesToMb(e.orderUsage);
    return {
      iccid,
      status: mapStatus(e.esimStatus, e.smdpStatus),
      totalMb,
      usedMb,
      remainingMb: totalMb === null ? null : Math.max(totalMb - usedMb, 0),
      expiresAt: e.expiredTime ?? null,
      raw: e,
    };
  },

  async getActivation(iccid: string): Promise<EsimActivation> {
    const e = await findByIccid(iccid);
    const { smdp, matchingId } = parseLpa(e?.ac);
    const lpa = e?.ac ?? "";
    return {
      iccid,
      smdpAddress: smdp,
      matchingId,
      lpaString: lpa,
      // Their hosted QR encodes the same LPA string; fall back to our own encoder.
      qrPayload: lpa || lpaQrPayload(smdp, matchingId),
    };
  },
};
