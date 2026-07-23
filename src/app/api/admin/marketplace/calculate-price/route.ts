import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { loadPricingRules } from "@/lib/marketplace/repository";
import { computePrice } from "@/lib/marketplace/pricing";

// Pricing preview: enter a supplier cost + scope, get the applied rule, markup,
// selling price, margin and profit — without touching any product.
export async function POST(req: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const costMinor = Number(b?.costMinor);
  if (!Number.isFinite(costMinor) || costMinor < 0) {
    return NextResponse.json({ error: "costMinor must be a non-negative integer" }, { status: 400 });
  }

  const rules = await loadPricingRules();
  const result = computePrice(
    Math.round(costMinor),
    rules,
    { category: b?.category ?? null, country: b?.country ?? null, supplierId: b?.supplierId ?? null },
    {
      priceOverrideMinor: b?.priceOverrideMinor ?? null,
      markupOverridePct: b?.markupOverridePct ?? null,
      promoPriceMinor: b?.promoPriceMinor ?? null,
    }
  );

  return NextResponse.json({
    appliedRule: result.appliedRuleName,
    appliedRuleId: result.appliedRuleId,
    source: result.source,
    markupPct: Number(result.markupPct.toFixed(2)),
    costMinor: result.costMinor,
    sellingPriceMinor: result.priceMinor,
    profitMinor: result.marginMinor,
    marginPct: Number((result.marginPct * 100).toFixed(2)),
  });
}
