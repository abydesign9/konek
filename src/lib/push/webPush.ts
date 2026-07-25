import webpush from "web-push";
import { query } from "@/lib/db";

// Server-side Web Push delivery. Configured lazily from the VAPID env keys; if
// they aren't set (e.g. before configuring push), sending is a no-op so callers
// never break. Dead subscriptions (410 Gone / 404) are pruned on send.

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@konek.app";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } else {
    configured = false;
  }
  return configured;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;

  const { rows } = await query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  if (rows.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        delivered++;
        await query(`UPDATE push_subscriptions SET last_used_at = now() WHERE id = $1`, [sub.id]);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // The subscription is gone/expired: remove it so we stop trying.
        if (statusCode === 404 || statusCode === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        }
      }
    })
  );

  return delivered;
}
