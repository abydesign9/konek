import { query } from "@/lib/db";
import { bumpCoinBalance } from "@/lib/gamification/coinBalance";
import { VendorServiceType } from "@/vendors/types";

const SERVICE_TYPE_TO_MISSION_CODE: Partial<Record<VendorServiceType, string>> = {
  esim: "first_esim",
  intl_topup: "first_intl_topup",
  electricity: "first_electricity",
};

// Marks the matching "first X" mission complete and pays out its coin
// reward — idempotent via the UNIQUE(user_id, mission_id) constraint plus
// an explicit status check, so replays are no-ops.
export async function checkMissions(userId: string, serviceType: VendorServiceType): Promise<void> {
  const code = SERVICE_TYPE_TO_MISSION_CODE[serviceType];
  if (!code) return;

  await completeMission(userId, code);
}

export async function completeMission(userId: string, missionCode: string): Promise<void> {
  const { rows: missionRows } = await query<{ id: string; coin_reward: number }>(
    `SELECT id, coin_reward FROM missions WHERE code = $1 AND active = true`,
    [missionCode]
  );
  const mission = missionRows[0];
  if (!mission) return;

  const { rows: existing } = await query<{ status: string }>(
    `SELECT status FROM user_missions WHERE user_id = $1 AND mission_id = $2`,
    [userId, mission.id]
  );
  if (existing[0]) return; // already tracked (in_progress/completed/claimed) — don't double-pay

  await query(
    `INSERT INTO user_missions (user_id, mission_id, status, completed_at) VALUES ($1, $2, 'completed', now())`,
    [userId, mission.id]
  );
  await query(
    `INSERT INTO reward_events (user_id, kind, coins, credit_minor, meta) VALUES ($1, 'mission', $2, 0, $3)`,
    [userId, mission.coin_reward, JSON.stringify({ missionCode })]
  );
  await bumpCoinBalance(userId, mission.coin_reward);
}
