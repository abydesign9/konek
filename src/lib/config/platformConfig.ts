import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Generic admin-editable config store. Each key holds a JSON value; callers
// own their own shape and provide a fallback for the (expected-rare) case
// where a key was never seeded.
export async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  const { rows } = await query<{ value: T }>(`SELECT value FROM platform_config WHERE key = $1`, [key]);
  return rows[0]?.value ?? fallback;
}

export async function setConfigValue(key: string, value: unknown, adminUserId: string): Promise<void> {
  await query(
    `INSERT INTO platform_config (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), adminUserId]
  );
  await logAudit(adminUserId, "platform_config_updated", "platform_config", key, { value });
}
