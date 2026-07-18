import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendNotification, type NotificationChannel } from "@/lib/notifications/send";

export class NotFoundError extends Error {
  constructor() {
    super("Campaign not found");
    this.name = "NotFoundError";
  }
}
export class SentCampaignImmutableError extends Error {
  constructor() {
    super("A sent campaign's history can't be deleted");
    this.name = "SentCampaignImmutableError";
  }
}

export type Audience =
  | "all"
  | "tier1"
  | "tier2"
  | "business"
  | "agent"
  | "diaspora"
  | "new_users"
  | "custom";

export interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  body: string;
  category: string | null;
  channels: string[];
  audience: Audience;
  audience_meta: { phones?: string[] } | null;
  schedule_type: "immediate" | "scheduled" | "recurring";
  scheduled_at: string | null;
  recurring_interval_hours: number | null;
  timezone: string;
  expiry_at: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_sent_at: string | null;
}

export interface CampaignInput {
  title: string;
  description?: string;
  templateId?: string;
  subject: string;
  body: string;
  category?: string;
  channels: NotificationChannel[];
  audience: Audience;
  audiencePhones?: string[]; // used when audience === 'custom'
  scheduleType: "immediate" | "scheduled" | "recurring";
  scheduledAt?: string;
  recurringIntervalHours?: number;
  timezone?: string;
  expiryAt?: string;
}

function initialStatus(scheduleType: CampaignInput["scheduleType"]): string {
  if (scheduleType === "immediate") return "draft"; // becomes 'sent' once send-now runs
  return "scheduled"; // config layer only — no worker fires this yet
}

export async function createCampaign(input: CampaignInput, actorId: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO notification_campaigns
       (title, description, template_id, subject, body, category, channels, audience, audience_meta,
        schedule_type, scheduled_at, recurring_interval_hours, timezone, expiry_at, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      input.title,
      input.description ?? null,
      input.templateId ?? null,
      input.subject,
      input.body,
      input.category ?? null,
      input.channels,
      input.audience,
      input.audience === "custom" ? JSON.stringify({ phones: input.audiencePhones ?? [] }) : null,
      input.scheduleType,
      input.scheduledAt ?? null,
      input.recurringIntervalHours ?? null,
      input.timezone ?? "Africa/Lagos",
      input.expiryAt ?? null,
      initialStatus(input.scheduleType),
      actorId,
    ]
  );
  await logAudit(actorId, "notification_campaign_created", "notification_campaign", rows[0].id, {
    title: input.title,
    audience: input.audience,
  });
  return { id: rows[0].id };
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { rows } = await query<CampaignRow>(
    `SELECT * FROM notification_campaigns ORDER BY created_at DESC LIMIT 200`
  );
  return rows;
}

export async function getCampaign(id: string): Promise<CampaignRow> {
  const { rows } = await query<CampaignRow>(`SELECT * FROM notification_campaigns WHERE id = $1`, [id]);
  if (!rows[0]) throw new NotFoundError();
  return rows[0];
}

export async function setCampaignStatus(id: string, status: string, actorId: string): Promise<void> {
  const { rowCount } = await query(`UPDATE notification_campaigns SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "notification_campaign_status_changed", "notification_campaign", id, { status });
}

export async function deleteCampaign(id: string, actorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>(`SELECT status FROM notification_campaigns WHERE id = $1`, [id]);
  if (!rows[0]) throw new NotFoundError();
  if (rows[0].status === "sent") throw new SentCampaignImmutableError();

  await query(`DELETE FROM notification_campaigns WHERE id = $1`, [id]);
  await logAudit(actorId, "notification_campaign_deleted", "notification_campaign", id);
}

// Resolves an audience to a list of user ids. 'custom' comes from an
// admin-supplied phone list rather than a full segment-builder query —
// scoped deliberately: a query-builder UI is a much bigger feature.
async function resolveAudience(audience: Audience, phones?: string[]): Promise<string[]> {
  let sql: string;
  const params: unknown[] = [];

  switch (audience) {
    case "all":
      sql = `SELECT id FROM users`;
      break;
    case "tier1":
      sql = `SELECT id FROM users WHERE kyc_tier >= 1`;
      break;
    case "tier2":
      sql = `SELECT id FROM users WHERE kyc_tier >= 2`;
      break;
    case "business":
      sql = `SELECT DISTINCT owner_user_id AS id FROM business_accounts
             UNION
             SELECT DISTINCT user_id AS id FROM business_team_members WHERE status = 'active'`;
      break;
    case "agent":
      sql = `SELECT user_id AS id FROM agents WHERE status = 'active'`;
      break;
    case "diaspora":
      sql = `SELECT id FROM users WHERE country_code != 'NG'`;
      break;
    case "new_users":
      sql = `SELECT id FROM users WHERE created_at >= now() - interval '7 days'`;
      break;
    case "custom":
      if (!phones || phones.length === 0) return [];
      params.push(phones);
      sql = `SELECT id FROM users WHERE phone = ANY($1)`;
      break;
    default:
      return [];
  }
  const { rows } = await query<{ id: string }>(sql, params);
  return rows.map((r) => r.id);
}

export async function previewAudienceSize(audience: Audience, phones?: string[]): Promise<number> {
  const ids = await resolveAudience(audience, phones);
  return ids.length;
}

// Sends a campaign right now, regardless of its schedule_type — the
// "Send Immediately" action, and also how an admin manually fires a
// scheduled/recurring campaign since no worker exists yet to do it for them.
export async function sendCampaignNow(campaignId: string, actorId: string): Promise<{ recipients: number; skipped?: boolean }> {
  // Claim the campaign atomically. 'sending' is a lock: a concurrent manual send
  // or an overlapping cron tick (the status only flips off 'sending' when this
  // send finishes) can't resolve the audience and blast everyone a second time —
  // which for SMS is real duplicated cost.
  const claim = await query<{ schedule_type: string }>(
    `UPDATE notification_campaigns SET status = 'sending', updated_at = now()
      WHERE id = $1 AND status <> 'sending' RETURNING schedule_type`,
    [campaignId]
  );
  if (claim.rowCount === 0) {
    const { rows } = await query<{ id: string }>(`SELECT id FROM notification_campaigns WHERE id = $1`, [campaignId]);
    if (!rows[0]) throw new NotFoundError();
    return { recipients: 0, skipped: true }; // a send is already in flight
  }
  const scheduleType = claim.rows[0].schedule_type;

  try {
    const campaign = await getCampaign(campaignId);
    const audiencePhones = campaign.audience_meta?.phones;
    const userIds = await resolveAudience(campaign.audience, audiencePhones);

    const channels = campaign.channels.filter((c): c is NotificationChannel =>
      ["push", "sms", "email", "whatsapp"].includes(c)
    );
    // in_app campaigns don't go through sendNotification (that's the
    // notifications feed) — they're picked up by the in-app-message CMS
    // instead, so only real notification channels are dispatched here.
    const realChannels = channels.length > 0 ? channels : (["push"] as NotificationChannel[]);

    let queued = 0;
    for (const userId of userIds) {
      for (const channel of realChannels) {
        const sent = await sendNotification(userId, channel, "price_alert", campaign.subject, campaign.body, campaignId);
        if (sent) queued += 1;
      }
    }

    await logAudit(actorId, "notification_campaign_sent", "notification_campaign", campaignId, {
      audienceSize: userIds.length,
      queued,
    });
    return { recipients: queued };
  } finally {
    // Release the lock: recurring campaigns return to 'active' (so the next
    // interval can fire), one-offs become 'sent'. last_sent_at drives the
    // recurring due-check.
    const finalStatus = scheduleType === "recurring" ? "active" : "sent";
    await query(
      `UPDATE notification_campaigns SET status = $2, last_sent_at = now(), updated_at = now() WHERE id = $1`,
      [campaignId, finalStatus]
    );
  }
}

// Called by the cron worker (see /api/cron/tick). Fires any one-off
// 'scheduled' campaign whose time has come, and any 'active' recurring
// campaign whose interval has elapsed since it last sent. sendCampaignNow()
// always leaves a campaign as 'sent' — for recurring campaigns we flip it
// back to 'active' immediately after so the next interval can fire it
// again; last_sent_at (also set by sendCampaignNow) is what the recurring
// due-check keys off.
export async function dispatchDueCampaigns(): Promise<{ dispatched: number }> {
  const { rows: due } = await query<{ id: string; schedule_type: string }>(
    `SELECT id, schedule_type FROM notification_campaigns
     WHERE (
       (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
       OR (
         status = 'active' AND schedule_type = 'recurring' AND recurring_interval_hours IS NOT NULL
         AND last_sent_at IS NOT NULL
         AND last_sent_at <= now() - (recurring_interval_hours || ' hours')::interval
       )
     )
     AND (expiry_at IS NULL OR expiry_at > now())`
  );

  // sendCampaignNow claims the campaign ('sending') and, on completion, returns
  // recurring campaigns to 'active' / one-offs to 'sent' — so this loop neither
  // double-fires nor needs a separate status flip.
  for (const c of due) {
    await sendCampaignNow(c.id, "system:cron");
  }
  return { dispatched: due.length };
}

export interface CampaignAnalytics {
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  openRatePct: number;
  clickRatePct: number;
  convertedPct: number;
}

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const { rows } = await query<{ delivered: string; opened: string; clicked: string }>(
    `SELECT COUNT(*) AS delivered,
            COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS opened,
            COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked
     FROM notifications WHERE campaign_id = $1`,
    [campaignId]
  );
  const delivered = Number(rows[0]?.delivered ?? 0);
  const opened = Number(rows[0]?.opened ?? 0);
  const clicked = Number(rows[0]?.clicked ?? 0);

  // "Converted" = recipient completed a delivered purchase within 48h of
  // receiving the notification — a real, if simple, proxy rather than an
  // invented metric with no data behind it.
  const { rows: convertedRows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT n.user_id) AS count
     FROM notifications n
     JOIN transactions t ON t.user_id = n.user_id
       AND t.status = 'delivered'
       AND t.created_at BETWEEN n.created_at AND n.created_at + interval '48 hours'
     WHERE n.campaign_id = $1`,
    [campaignId]
  );
  const converted = Number(convertedRows[0]?.count ?? 0);

  return {
    delivered,
    opened,
    clicked,
    converted,
    openRatePct: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    clickRatePct: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
    convertedPct: delivered > 0 ? Math.round((converted / delivered) * 100) : 0,
  };
}
