import { getConfigValue, setConfigValue } from "./platformConfig";
import { KYC_TIER } from "@/lib/kyc/tiers";

// Admin-tunable financial settings, stored in platform_config and READ by the
// live code paths (account provisioning, card issuance). Defaults preserve
// current behavior, so an untouched install behaves exactly as before.

const KEY = "financial_config";

export interface FinancialConfig {
  cardCreationFeeMinorNGN: number;
  cardCreationFeeMinorUSD: number;
  nairaAccountKycTier: number;
  dollarAccountKycTier: number;
}

export const FINANCIAL_DEFAULTS: FinancialConfig = {
  cardCreationFeeMinorNGN: 0,
  cardCreationFeeMinorUSD: 0,
  nairaAccountKycTier: KYC_TIER.TRANSACT, // BVN/NIN
  dollarAccountKycTier: KYC_TIER.FINANCE, // ID + liveness
};

export async function getFinancialConfig(): Promise<FinancialConfig> {
  const stored = await getConfigValue<Partial<FinancialConfig>>(KEY, {});
  return { ...FINANCIAL_DEFAULTS, ...stored };
}

export async function setFinancialConfig(patch: Partial<FinancialConfig>, adminUserId: string): Promise<FinancialConfig> {
  const current = await getFinancialConfig();
  const next = { ...current, ...patch };
  await setConfigValue(KEY, next, adminUserId);
  return next;
}
