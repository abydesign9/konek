import { query } from "@/lib/db";
import { getBalance } from "@/lib/ledger/balance";
import { getBusinessWalletAccount } from "@/lib/ledger/accounts";
import { sendNotification } from "@/lib/notifications/send";

interface AlertPrefs {
  owner_user_id: string;
  notify_failed_distributions: boolean;
  notify_low_balance: boolean;
  low_balance_threshold_minor: string;
}

async function getPrefs(businessId: string): Promise<AlertPrefs | null> {
  const { rows } = await query<AlertPrefs>(
    `SELECT owner_user_id, notify_failed_distributions, notify_low_balance, low_balance_threshold_minor
     FROM business_accounts WHERE id = $1`,
    [businessId]
  );
  return rows[0] ?? null;
}

// Called after a distribution finishes — alerts the owner if any items failed
// and the business has this preference on.
export async function notifyIfDistributionFailed(businessId: string, failed: number, purpose: string): Promise<void> {
  if (failed <= 0) return;
  const prefs = await getPrefs(businessId);
  if (!prefs || !prefs.notify_failed_distributions) return;
  await sendNotification(
    prefs.owner_user_id,
    "push",
    "support",
    "Distribution had failures",
    `${failed} item(s) in "${purpose}" could not be delivered. Check Distributions for details.`
  );
}

// Called after money leaves the business wallet (card fee, vendor transfer) —
// alerts the owner once the balance drops under their configured threshold.
export async function notifyIfLowBalance(businessId: string, currency: string): Promise<void> {
  const prefs = await getPrefs(businessId);
  if (!prefs || !prefs.notify_low_balance) return;
  if (currency !== "NGN") return; // threshold is configured in NGN for now
  const balance = await getBusinessWalletAccount(businessId, currency).then(getBalance);
  if (balance >= Number(prefs.low_balance_threshold_minor)) return;
  await sendNotification(
    prefs.owner_user_id,
    "push",
    "support",
    "Business wallet balance is low",
    `Your ${currency} business wallet balance is ₦${(balance / 100).toLocaleString()}. Add funds to avoid interruptions.`
  );
}
