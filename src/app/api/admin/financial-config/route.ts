import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { assertPermission, ForbiddenError } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { getFinancialConfig, setFinancialConfig, type FinancialConfig } from "@/lib/config/financialConfig";

// Everything the "financial config" console needs: the tunable settings, the
// transaction-limit matrix (read live by checkLimits), read-only provider
// status (derived from env, since keys never live in the DB), and live stats.

function providerStatus() {
  const set = (v?: string, placeholder?: string) => Boolean(v && v !== placeholder);
  return [
    { service: "Wallet funding", provider: "Paystack", live: set(process.env.PAYSTACK_SECRET_KEY, "sk_test_...") },
    { service: "NGN virtual accounts", provider: "Monnify", live: set(process.env.MONNIFY_API_KEY) },
    { service: "USD virtual accounts", provider: "Fincra", live: set(process.env.FINCRA_API_KEY) },
    { service: "eSIM", provider: "eSIM Access", live: set(process.env.ESIM_ACCESS_ACCESS_CODE) },
    { service: "KYC (async)", provider: "SmileID / provider webhook", live: set(process.env.KYC_WEBHOOK_SECRET) },
    { service: "Push notifications", provider: "Web Push (VAPID)", live: set(process.env.VAPID_PRIVATE_KEY) },
  ];
}

async function liveStats() {
  const q = async (sql: string) => Number((await query<{ v: string }>(sql)).rows[0]?.v ?? 0);
  const [naira, usd, inflow, cards, cardSpend, promoPaid, users] = await Promise.all([
    q(`SELECT count(*) v FROM virtual_accounts WHERE currency='NGN'`),
    q(`SELECT count(*) v FROM virtual_accounts WHERE currency<>'NGN'`),
    q(`SELECT COALESCE(sum(amount_minor),0) v FROM transactions WHERE type IN ('va_inflow','dollar_inflow') AND status='delivered'`),
    q(`SELECT count(*) v FROM cards WHERE status='active'`),
    q(`SELECT COALESCE(sum(amount_minor),0) v FROM transactions WHERE type='card_purchase' AND status='delivered'`),
    q(`SELECT COALESCE(sum(total_paid_out_minor),0) v FROM promotions`),
    q(`SELECT count(*) v FROM users`),
  ]);
  return { nairaAccounts: naira, usdAccounts: usd, totalInflowMinor: inflow, activeCards: cards, cardSpendMinor: cardSpend, promoPaidMinor: promoPaid, users };
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { rows: limits } = await query(
    `SELECT kyc_tier, metric, currency, max_minor FROM limits ORDER BY currency, kyc_tier, metric`
  );
  return NextResponse.json({
    config: await getFinancialConfig(),
    limits,
    providers: providerStatus(),
    stats: await liveStats(),
  });
}

const NUM_KEYS: (keyof FinancialConfig)[] = ["cardCreationFeeMinorNGN", "cardCreationFeeMinorUSD", "nairaAccountKycTier", "dollarAccountKycTier"];

export async function PUT(req: NextRequest) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await assertPermission(admin.role, "rates.edit");
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const b = await req.json().catch(() => null);
  const patch: Partial<FinancialConfig> = {};
  for (const k of NUM_KEYS) if (k in (b ?? {}) && Number.isFinite(Number(b[k]))) (patch[k] as number) = Math.round(Number(b[k]));

  const next = await setFinancialConfig(patch, admin.adminUserId);
  return NextResponse.json({ ok: true, config: next });
}
