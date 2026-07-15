import { query } from "@/lib/db";

export type NotificationChannel = "push" | "sms" | "email" | "whatsapp";
export type NotificationKind = "txn_receipt" | "price_alert" | "streak_reminder" | "support";

interface Preferences {
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  price_alerts: boolean;
}

async function getPreferences(userId: string): Promise<Preferences> {
  const { rows } = await query<Preferences>(
    `SELECT push_enabled, sms_enabled, email_enabled, whatsapp_enabled, price_alerts FROM notification_preferences WHERE user_id = $1`,
    [userId]
  );
  if (rows[0]) return rows[0];
  await query(`INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
  return { push_enabled: true, sms_enabled: true, email_enabled: true, whatsapp_enabled: true, price_alerts: true };
}

function channelEnabled(prefs: Preferences, channel: NotificationChannel): boolean {
  if (channel === "push") return prefs.push_enabled;
  if (channel === "sms") return prefs.sms_enabled;
  if (channel === "email") return prefs.email_enabled;
  return prefs.whatsapp_enabled;
}

// Mock delivery — logs like the SMS/mock-checkout pattern elsewhere in the
// app. Swap for real push/SMS/email providers behind this same function
// signature when those vendors are wired up; callers never change.
async function deliver(channel: NotificationChannel, userId: string, title: string, body: string) {
  console.log(`[mock-notify:${channel}] to user ${userId}: ${title} — ${body}`);
}

// Returns whether it actually queued a notification (false = skipped by
// preference) so a campaign send can report a real recipient count rather
// than counting everyone it merely attempted.
export async function sendNotification(
  userId: string,
  channel: NotificationChannel,
  kind: NotificationKind,
  title: string,
  body: string,
  campaignId?: string
): Promise<boolean> {
  if (kind === "price_alert") {
    const prefs = await getPreferences(userId);
    if (!prefs.price_alerts) return false;
  }

  const prefs = await getPreferences(userId);
  if (!channelEnabled(prefs, channel)) return false;

  const { rows } = await query<{ id: string }>(
    `INSERT INTO notifications (user_id, channel, kind, title, body, campaign_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, channel, kind, title, body, campaignId ?? null]
  );

  await deliver(channel, userId, title, body);
  await query(`UPDATE notifications SET sent_at = now() WHERE id = $1`, [rows[0].id]);
  return true;
}
