// Shared display helpers for money and transactions. Amounts are always
// integers in minor units (kobo/cents); currency is always explicit.

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$" };

export function formatMoney(minor: number | string, currency: string): string {
  const value = Number(minor) / 100;
  const symbol = SYMBOL[currency] ?? "";
  const formatted = value.toLocaleString("en-NG", {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

// Human labels for the transaction.type enum in db/schema.sql.
export const TXN_TYPE_LABEL: Record<string, string> = {
  fund_wallet: "Wallet funding",
  airtime: "Airtime",
  data: "Data",
  cable: "Cable TV",
  electricity: "Electricity",
  exam_pin: "Exam pin",
  betting: "Betting",
  gift_card: "Gift card",
  intl_topup: "International top-up",
  intl_data: "Data top-up",
  esim: "eSIM",
  fx_convert: "Currency conversion",
  reward_credit: "Reward credit",
  refund: "Refund",
  dollar_inflow: "Dollar inflow",
  withdrawal: "Withdrawal",
};

export function txnTypeLabel(type: string): string {
  return TXN_TYPE_LABEL[type] ?? type.replace(/_/g, " ");
}

// Money coming *into* the wallet vs going out — drives the +/- sign and colour.
const CREDIT_TYPES = new Set(["fund_wallet", "reward_credit", "refund", "dollar_inflow"]);

export function isCredit(type: string): boolean {
  return CREDIT_TYPES.has(type);
}

export const TXN_STATUS_LABEL: Record<string, string> = {
  initiated: "Processing",
  pending_vendor: "Processing",
  delivered: "Successful",
  failed: "Failed",
  refunded: "Refunded",
};

// Tailwind colour classes per status, for badges.
export const TXN_STATUS_CLASS: Record<string, string> = {
  initiated: "bg-gold/15 text-gold",
  pending_vendor: "bg-gold/15 text-gold",
  delivered: "bg-konek-green/15 text-konek-green",
  failed: "bg-red-100 text-red-600",
  refunded: "bg-indigo/10 text-indigo",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
