import { resilientRequest } from "@/lib/http/resilientHttp";
import { ProviderOperation } from "@/lib/vendors/providerMetrics";
import { RequestSigner } from "./signing";
import {
  PurchaseParams,
  PurchaseResult,
  ProviderCapabilities,
  VendorAdapter,
  VendorPlan,
  VendorServiceType,
  VerifyResult,
} from "./types";

// Base class for HTTP-backed provider adapters. It owns the plumbing that every
// provider shares — signing, routing calls through the resilience layer
// (timeout/retry/circuit/metrics), URL assembly, JSON parsing — and leaves ONLY
// the provider-specific request building and response parsing to subclasses.
// This is the skeleton a concrete adapter fills in from official API docs, with
// zero business-logic changes. (The mock adapters implement VendorAdapter
// directly and remain the reference for the *interface* contract.)

export interface BaseAdapterConfig {
  id: string;
  capabilities: ProviderCapabilities;
  baseUrl: string;
  signer: RequestSigner;
  timeoutMs?: number;
  retries?: number;
}

export interface ProviderRequest {
  method?: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export abstract class BaseVendorAdapter implements VendorAdapter {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;
  protected readonly baseUrl: string;
  protected readonly signer: RequestSigner;
  protected readonly timeoutMs?: number;
  protected readonly retries?: number;

  constructor(cfg: BaseAdapterConfig) {
    this.id = cfg.id;
    this.capabilities = cfg.capabilities;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.signer = cfg.signer;
    this.timeoutMs = cfg.timeoutMs;
    this.retries = cfg.retries;
  }

  // Sign + send through the shared resilience layer + parse JSON. All provider
  // calls MUST go through here so metrics/circuit-breaker/timeout apply.
  protected async call<T>(operation: ProviderOperation, req: ProviderRequest): Promise<T> {
    const bodyStr = req.body !== undefined ? JSON.stringify(req.body) : undefined;
    const signed = this.signer.sign({
      method: req.method ?? "POST",
      url: this.baseUrl + req.path,
      headers: { "Content-Type": "application/json", ...(req.headers ?? {}) },
      body: bodyStr,
    });
    const res = await resilientRequest({
      provider: this.id,
      operation,
      url: signed.url,
      method: signed.method,
      headers: signed.headers,
      body: signed.body,
      timeoutMs: this.timeoutMs,
      retries: this.retries,
    });
    return res.json<T>();
  }

  // --- Provider-specific mapping (implement from the official API docs) ---
  protected abstract buildPurchase(params: PurchaseParams): ProviderRequest;
  protected abstract parsePurchase(raw: unknown, params: PurchaseParams): PurchaseResult;
  protected abstract buildVerify(vendorRef: string): ProviderRequest;
  protected abstract parseVerify(raw: unknown): VerifyResult;
  protected abstract buildBalance(): ProviderRequest;
  protected abstract parseBalance(raw: unknown): number;
  protected abstract healthCheck(): Promise<boolean>;
  // Optional catalog mapping — only if capabilities.supportsCatalog.
  protected buildListPlans?(serviceType: VendorServiceType): ProviderRequest;
  protected parsePlans?(raw: unknown, serviceType: VendorServiceType): VendorPlan[];

  // --- VendorAdapter surface (stable; never overridden per provider) ---
  async purchase(params: PurchaseParams): Promise<PurchaseResult> {
    const raw = await this.call<unknown>("purchase", this.buildPurchase(params));
    return this.parsePurchase(raw, params);
  }
  async verify(vendorRef: string): Promise<VerifyResult> {
    const raw = await this.call<unknown>("verify", this.buildVerify(vendorRef));
    return this.parseVerify(raw);
  }
  async balance(): Promise<number> {
    const raw = await this.call<unknown>("balance", this.buildBalance());
    return this.parseBalance(raw);
  }
  async health(): Promise<boolean> {
    return this.healthCheck();
  }
  async listPlans(serviceType: VendorServiceType): Promise<VendorPlan[]> {
    if (!this.capabilities.supportsCatalog || !this.buildListPlans || !this.parsePlans) return [];
    const raw = await this.call<unknown>("catalog", this.buildListPlans(serviceType));
    return this.parsePlans(raw, serviceType);
  }
}
