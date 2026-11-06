import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// PRD M9 roles. The owner is implicit (business_accounts.owner_user_id) and
// outranks everyone. Permissions are deliberately coarse for Phase 2 start:
//   distribute  — upload/process bulk batches
//   manage_team — invite/remove members
//   view        — see the business, batches, reports (every role has this)
export const TEAM_ROLES = ["admin", "finance", "hr", "marketing", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

const CAN_DISTRIBUTE: ReadonlySet<string> = new Set(["owner", "admin", "finance", "hr"]);
const CAN_MANAGE_TEAM: ReadonlySet<string> = new Set(["owner", "admin"]);
// Accounts, cards, vendor transfers — real money movement, tighter than
// distributions (which spend from a pre-funded float on VTU, not free cash out).
const CAN_MANAGE_MONEY: ReadonlySet<string> = new Set(["owner", "admin", "finance"]);

export class NotAMemberError extends Error {
  constructor() {
    super("You are not a member of a business account");
    this.name = "NotAMemberError";
  }
}

export class ForbiddenRoleError extends Error {
  constructor(action: string, role: string) {
    super(`Your role (${role}) cannot ${action}`);
    this.name = "ForbiddenRoleError";
  }
}

export interface BusinessMembership {
  businessAccountId: string;
  role: "owner" | TeamRole;
  ownerUserId: string;
}

// Resolves the business a user can act on — as owner first, else as an
// active team member. One business per user for now (matches applyAsBusiness).
export async function getMembership(userId: string): Promise<BusinessMembership | null> {
  const { rows: owned } = await query<{ id: string; owner_user_id: string }>(
    `SELECT id, owner_user_id FROM business_accounts WHERE owner_user_id = $1`,
    [userId]
  );
  if (owned[0]) return { businessAccountId: owned[0].id, role: "owner", ownerUserId: owned[0].owner_user_id };

  const { rows: member } = await query<{ business_account_id: string; role: TeamRole; owner_user_id: string }>(
    `SELECT m.business_account_id, m.role, b.owner_user_id
     FROM business_team_members m
     JOIN business_accounts b ON b.id = m.business_account_id
     WHERE m.user_id = $1 AND m.status = 'active'
     LIMIT 1`,
    [userId]
  );
  if (!member[0]) return null;
  return {
    businessAccountId: member[0].business_account_id,
    role: member[0].role,
    ownerUserId: member[0].owner_user_id,
  };
}

export type VerifiedBusinessGate =
  | { ok: true; membership: BusinessMembership }
  | { ok: false; status: number; error: string; code: "no_business" | "kyb_pending" | "kyb_rejected" };

// Membership + KYB gate in one step. Every business API that reads or moves
// business data must use this instead of bare getMembership: applying only
// creates a PENDING application, and nothing beyond /business/me is available
// until an admin approves it (kyb_status = 'verified').
export async function requireVerifiedBusiness(userId: string): Promise<VerifiedBusinessGate> {
  const membership = await getMembership(userId);
  if (!membership) {
    return { ok: false, status: 404, error: "No business on this account", code: "no_business" };
  }

  const { rows } = await query<{ kyb_status: string }>(
    `SELECT kyb_status FROM business_accounts WHERE id = $1`,
    [membership.businessAccountId]
  );
  const status = rows[0]?.kyb_status ?? "pending";
  if (status === "rejected") {
    return { ok: false, status: 403, error: "This business application was rejected — contact support", code: "kyb_rejected" };
  }
  if (status !== "verified") {
    return {
      ok: false,
      status: 403,
      error: "This business is awaiting verification — you'll get access once raviion approves it",
      code: "kyb_pending",
    };
  }
  return { ok: true, membership };
}

export function canDistribute(role: string): boolean {
  return CAN_DISTRIBUTE.has(role);
}

export function assertCanManageTeam(role: string): void {
  if (!CAN_MANAGE_TEAM.has(role)) throw new ForbiddenRoleError("manage the team", role);
}

export function assertCanManageMoney(role: string): void {
  if (!CAN_MANAGE_MONEY.has(role)) throw new ForbiddenRoleError("move business funds", role);
}

export interface TeamMemberRow {
  id: string;
  user_id: string;
  phone: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export async function listTeam(businessAccountId: string): Promise<TeamMemberRow[]> {
  const { rows } = await query<TeamMemberRow>(
    `SELECT m.id, m.user_id, u.phone, u.full_name, m.role, m.created_at
     FROM business_team_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.business_account_id = $1 AND m.status = 'active'
     ORDER BY m.created_at ASC`,
    [businessAccountId]
  );
  return rows;
}

export class UserNotFoundError extends Error {
  constructor(phone: string) {
    super(`No raviion user with phone ${phone} — they must sign up first`);
    this.name = "UserNotFoundError";
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super("That user is already on the team");
    this.name = "AlreadyMemberError";
  }
}

export async function inviteMember(
  businessAccountId: string,
  actorUserId: string,
  phone: string,
  role: TeamRole
): Promise<{ memberId: string }> {
  const { rows: users } = await query<{ id: string }>(`SELECT id FROM users WHERE phone = $1`, [phone]);
  if (!users[0]) throw new UserNotFoundError(phone);
  const userId = users[0].id;

  const { rows: owner } = await query<{ owner_user_id: string }>(
    `SELECT owner_user_id FROM business_accounts WHERE id = $1`,
    [businessAccountId]
  );
  if (owner[0]?.owner_user_id === userId) throw new AlreadyMemberError();

  // Re-inviting a removed member reactivates the same row (no deletes).
  const { rows: existing } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM business_team_members WHERE business_account_id = $1 AND user_id = $2`,
    [businessAccountId, userId]
  );
  let memberId: string;
  if (existing[0]) {
    if (existing[0].status === "active") throw new AlreadyMemberError();
    await query(
      `UPDATE business_team_members SET status = 'active', role = $2, removed_at = NULL WHERE id = $1`,
      [existing[0].id, role]
    );
    memberId = existing[0].id;
  } else {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO business_team_members (business_account_id, user_id, role, invited_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [businessAccountId, userId, role, actorUserId]
    );
    memberId = rows[0].id;
  }
  await logAudit(actorUserId, "business_member_invited", "business_team_member", memberId, { businessId: businessAccountId, phone, role });
  return { memberId };
}

export async function removeMember(businessAccountId: string, actorUserId: string, memberId: string): Promise<void> {
  await query(
    `UPDATE business_team_members SET status = 'removed', removed_at = now()
     WHERE id = $1 AND business_account_id = $2`,
    [memberId, businessAccountId]
  );
  await logAudit(actorUserId, "business_member_removed", "business_team_member", memberId, { businessId: businessAccountId });
}

// Change an existing member's role. The owner isn't a row in
// business_team_members (their role is implicit), so this can never touch them.
export async function changeMemberRole(businessAccountId: string, actorUserId: string, memberId: string, role: TeamRole): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE business_team_members SET role = $3 WHERE id = $1 AND business_account_id = $2 AND status = 'active'`,
    [memberId, businessAccountId, role]
  );
  if (rowCount) {
    await logAudit(actorUserId, "business_member_role_changed", "business_team_member", memberId, { businessId: businessAccountId, role });
  }
  return !!rowCount;
}
