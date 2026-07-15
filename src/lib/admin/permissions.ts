import { query } from "@/lib/db";

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`Your role does not have the '${permission}' permission`);
    this.name = "ForbiddenError";
  }
}

export interface AdminRoleRow {
  name: string;
  description: string | null;
}

export interface AdminPermissionRow {
  key: string;
  type_key: string;
  label: string;
}

export async function listRoles(): Promise<AdminRoleRow[]> {
  const { rows } = await query<AdminRoleRow>(`SELECT name, description FROM admin_roles ORDER BY name`);
  return rows;
}

export async function listPermissions(): Promise<AdminPermissionRow[]> {
  const { rows } = await query<AdminPermissionRow>(
    `SELECT key, type_key, label FROM admin_permissions ORDER BY type_key, key`
  );
  return rows;
}

export async function listPermissionTypes(): Promise<{ key: string; label: string }[]> {
  const { rows } = await query<{ key: string; label: string }>(
    `SELECT key, label FROM admin_permission_types ORDER BY key`
  );
  return rows;
}

// role_name -> Set of permission keys, one query for the whole matrix (used
// by the Users/Roles admin page to render an editable grid).
export async function getRolePermissionMatrix(): Promise<Record<string, string[]>> {
  const { rows } = await query<{ role_name: string; permission_key: string }>(
    `SELECT role_name, permission_key FROM admin_role_permissions`
  );
  const matrix: Record<string, string[]> = {};
  for (const r of rows) {
    (matrix[r.role_name] ??= []).push(r.permission_key);
  }
  return matrix;
}

export async function setRolePermissions(roleName: string, permissionKeys: string[]): Promise<void> {
  await query(`DELETE FROM admin_role_permissions WHERE role_name = $1`, [roleName]);
  for (const key of permissionKeys) {
    await query(
      `INSERT INTO admin_role_permissions (role_name, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleName, key]
    );
  }
}

export async function roleHasPermission(roleName: string, permissionKey: string): Promise<boolean> {
  const { rows } = await query<{ ok: boolean }>(
    `SELECT true AS ok FROM admin_role_permissions WHERE role_name = $1 AND permission_key = $2`,
    [roleName, permissionKey]
  );
  return rows.length > 0;
}

// Call at the top of any admin route that gates a real capability. Throws
// ForbiddenError (route maps this to a 403) rather than silently no-op'ing.
export async function assertPermission(roleName: string, permissionKey: string): Promise<void> {
  if (!(await roleHasPermission(roleName, permissionKey))) {
    throw new ForbiddenError(permissionKey);
  }
}
