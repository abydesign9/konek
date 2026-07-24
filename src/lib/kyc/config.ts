import { query } from "@/lib/db";
import type { Requirement } from "./tierEngine";

// DB-backed KYC configuration: methods, providers and the requirement matrix.
// Everything the global model needs to add a country or provider lives in data,
// loaded here. No country codes or method names are hardcoded in the service.

export interface VerificationMethod {
  code: string;
  label: string;
  kind: "number_lookup" | "document" | "biometric" | "address";
  validationRegex: string | null;
  active: boolean;
}

export interface KycProvider {
  id: string;
  name: string;
  adapterKey: string;
  countries: string[]; // ISO2 or ['*']
  methods: string[];
  priority: number;
  enabled: boolean;
}

export async function loadMethods(): Promise<VerificationMethod[]> {
  const { rows } = await query<{
    code: string;
    label: string;
    kind: VerificationMethod["kind"];
    validation_regex: string | null;
    active: boolean;
  }>(`SELECT code, label, kind, validation_regex, active FROM verification_methods ORDER BY code`);
  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    kind: r.kind,
    validationRegex: r.validation_regex,
    active: r.active,
  }));
}

export async function loadRequirements(): Promise<Requirement[]> {
  const { rows } = await query<{
    country_code: string | null;
    tier: number;
    method_groups: string[][];
    label: string | null;
    active: boolean;
  }>(`SELECT country_code, tier, method_groups, label, active FROM kyc_requirements`);
  return rows.map((r) => ({
    countryCode: r.country_code,
    tier: r.tier,
    methodGroups: r.method_groups,
    label: r.label,
    active: r.active,
  }));
}

export async function loadProviders(): Promise<KycProvider[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    adapter_key: string;
    countries: string[];
    methods: string[];
    priority: number;
    enabled: boolean;
  }>(`SELECT id, name, adapter_key, countries, methods, priority, enabled FROM kyc_providers ORDER BY priority`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    adapterKey: r.adapter_key,
    countries: r.countries,
    methods: r.methods,
    priority: r.priority,
    enabled: r.enabled,
  }));
}

// Route a (country, method) to the best enabled provider: country-specific
// beats a global ('*') provider, then lowest priority wins.
export function selectProvider(providers: KycProvider[], countryCode: string, method: string): KycProvider | null {
  const cc = countryCode.toUpperCase();
  const eligible = providers
    .filter((p) => p.enabled && p.methods.includes(method))
    .filter((p) => p.countries.includes("*") || p.countries.map((c) => c.toUpperCase()).includes(cc));
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    const aSpecific = a.countries.includes("*") ? 1 : 0;
    const bSpecific = b.countries.includes("*") ? 1 : 0;
    if (aSpecific !== bSpecific) return aSpecific - bSpecific; // specific first
    return a.priority - b.priority;
  });
  return eligible[0];
}
