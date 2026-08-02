import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export class NotFoundError extends Error {
  constructor() {
    super("Employee not found");
    this.name = "NotFoundError";
  }
}

export interface EmployeeRow {
  id: string;
  full_name: string;
  department: string | null;
  phone: string;
  network: string;
  status: string;
  created_at: string;
}

export async function listEmployees(businessAccountId: string): Promise<EmployeeRow[]> {
  const { rows } = await query<EmployeeRow>(
    `SELECT id, full_name, department, phone, network, status, created_at
     FROM business_employees WHERE business_account_id = $1
     ORDER BY full_name ASC`,
    [businessAccountId]
  );
  return rows;
}

export interface EmployeeInput {
  fullName: string;
  department?: string | null;
  phone: string;
  network: string;
}

export async function addEmployee(
  businessAccountId: string,
  input: EmployeeInput,
  actorId: string
): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO business_employees (business_account_id, full_name, department, phone, network, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (business_account_id, phone) DO UPDATE SET full_name = $2, department = $3, network = $5, updated_at = now()
     RETURNING id`,
    [businessAccountId, input.fullName, input.department ?? null, input.phone, input.network, actorId]
  );
  await logAudit(actorId, "business_employee_added", "business_employee", rows[0].id, { businessId: businessAccountId, fullName: input.fullName });
  return { id: rows[0].id };
}

// One row per line of a pasted list — same "no CSV syntax exposed to the
// button, but a real bulk path underneath" as the bulk_batch upload it
// sits next to. Returns how many rows were added so the UI can confirm.
export async function addEmployeesBulk(
  businessAccountId: string,
  rowsInput: EmployeeInput[],
  actorId: string
): Promise<{ added: number }> {
  let added = 0;
  for (const row of rowsInput) {
    await addEmployee(businessAccountId, row, actorId);
    added++;
  }
  return { added };
}

export async function setEmployeeStatus(
  id: string,
  businessAccountId: string,
  status: "active" | "inactive",
  actorId: string
): Promise<void> {
  const { rowCount } = await query(
    `UPDATE business_employees SET status = $3, updated_at = now() WHERE id = $1 AND business_account_id = $2`,
    [id, businessAccountId, status]
  );
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "business_employee_status_changed", "business_employee", id, { businessId: businessAccountId, status });
}

export async function deleteEmployee(id: string, businessAccountId: string, actorId: string): Promise<void> {
  const { rowCount } = await query(
    `DELETE FROM business_employees WHERE id = $1 AND business_account_id = $2`,
    [id, businessAccountId]
  );
  if (!rowCount) throw new NotFoundError();
  await logAudit(actorId, "business_employee_deleted", "business_employee", id, { businessId: businessAccountId });
}
