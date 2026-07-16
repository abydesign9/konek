import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export class NotFoundError extends Error {
  constructor() {
    super("Onboarding tour step not found");
    this.name = "NotFoundError";
  }
}

export interface TourStepRow {
  id: string;
  step_order: number;
  icon: string;
  title: string;
  body: string;
  status: string; // draft|active|inactive
  created_at: string;
  updated_at: string;
}

export async function listAllTourSteps(): Promise<TourStepRow[]> {
  const { rows } = await query<TourStepRow>(`SELECT * FROM onboarding_tour_steps ORDER BY step_order ASC`);
  return rows;
}

// Customer-facing: only what's actually live right now, in order.
export async function listActiveTourSteps(): Promise<TourStepRow[]> {
  const { rows } = await query<TourStepRow>(
    `SELECT * FROM onboarding_tour_steps WHERE status = 'active' ORDER BY step_order ASC`
  );
  return rows;
}

export interface TourStepInput {
  stepOrder: number;
  icon: string;
  title: string;
  body: string;
  status: string;
}

export async function createTourStep(input: TourStepInput, actorId: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO onboarding_tour_steps (step_order, icon, title, body, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [input.stepOrder, input.icon, input.title, input.body, input.status, actorId]
  );
  await logAudit(actorId, "onboarding_tour_step_created", "onboarding_tour_step", rows[0].id, { title: input.title });
  return { id: rows[0].id };
}

export async function updateTourStep(id: string, updates: Partial<TourStepInput>, actorId: string): Promise<void> {
  const columnMap: Record<string, string> = {
    stepOrder: "step_order",
    icon: "icon",
    title: "title",
    body: "body",
    status: "status",
  };
  const sets: string[] = [];
  const vals: unknown[] = [id];
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || !columnMap[key]) continue;
    vals.push(value);
    sets.push(`${columnMap[key]} = $${vals.length}`);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);

  const { rowCount } = await query(`UPDATE onboarding_tour_steps SET ${sets.join(", ")} WHERE id = $1`, vals);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "onboarding_tour_step_updated", "onboarding_tour_step", id, updates);
}

export async function deleteTourStep(id: string, actorId: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM onboarding_tour_steps WHERE id = $1`, [id]);
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "onboarding_tour_step_deleted", "onboarding_tour_step", id);
}
