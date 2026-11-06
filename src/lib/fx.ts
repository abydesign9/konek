import { getConfigValue } from "@/lib/config/platformConfig";

// Seeded defaults (see migration 0014) — used only if platform_config's
// 'fx_rate' row is ever missing. Admin-editable via /admin/rates; every
// USD-priced product (intl top-up, eSIM, gift cards, dollar-account
// conversion) reads the live value through the functions below rather than
// a hardcoded constant.
export const DEFAULT_NGN_PER_USD = 1600;
export const DEFAULT_USD_NGN_SPREAD = 0.015;

export interface FxRateConfig {
  ngnPerUsd: number;
  usdNgnSpreadPct: number;
}

export async function getFxRateConfig(): Promise<FxRateConfig> {
  return getConfigValue<FxRateConfig>("fx_rate", {
    ngnPerUsd: DEFAULT_NGN_PER_USD,
    usdNgnSpreadPct: DEFAULT_USD_NGN_SPREAD,
  });
}

export async function usdMinorToNgnMinor(usdMinor: number): Promise<number> {
  const { ngnPerUsd } = await getFxRateConfig();
  return Math.round(usdMinor * ngnPerUsd);
}

// raviion's revenue on USD→NGN conversion is the FX spread: the user is credited
// naira at a rate slightly below mid-market, and raviion keeps the difference
// (realized as it holds the USD).
//
// NGN (kobo) a user receives for converting a given amount of USD (cents),
// after the spread. Floored so we never over-credit by a fraction of a kobo.
export async function usdMinorToNgnMinorUserRate(usdMinor: number): Promise<number> {
  const { ngnPerUsd, usdNgnSpreadPct } = await getFxRateConfig();
  return Math.floor(usdMinor * ngnPerUsd * (1 - usdNgnSpreadPct));
}
