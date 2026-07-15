import { describe, expect, it, vi, beforeEach } from "vitest";

interface Row {
  [k: string]: unknown;
}

let ownedBusiness: Row | null;
let memberRow: Row | null;
let userByPhone: Row | null;
let existingMember: Row | null;
let inserted: Row[];

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (text: string, params: unknown[]) => {
    if (text.includes("FROM business_accounts WHERE owner_user_id")) {
      return { rows: ownedBusiness ? [ownedBusiness] : [] };
    }
    if (text.includes("FROM business_team_members m")) {
      return { rows: memberRow ? [memberRow] : [] };
    }
    if (text.includes("SELECT id FROM users WHERE phone")) {
      return { rows: userByPhone ? [userByPhone] : [] };
    }
    if (text.includes("SELECT owner_user_id FROM business_accounts WHERE id")) {
      return { rows: [{ owner_user_id: "owner-1" }] };
    }
    if (text.includes("SELECT id, status FROM business_team_members")) {
      return { rows: existingMember ? [existingMember] : [] };
    }
    if (text.startsWith("INSERT INTO business_team_members")) {
      inserted.push({ params });
      return { rows: [{ id: "m-new" }] };
    }
    if (text.startsWith("UPDATE business_team_members")) {
      return { rows: [] };
    }
    throw new Error(`unexpected query: ${text}`);
  }),
}));

const {
  getMembership,
  canDistribute,
  assertCanManageTeam,
  inviteMember,
  ForbiddenRoleError,
  UserNotFoundError,
  AlreadyMemberError,
} = await import("./teamService");

describe("teamService", () => {
  beforeEach(() => {
    ownedBusiness = null;
    memberRow = null;
    userByPhone = null;
    existingMember = null;
    inserted = [];
  });

  it("resolves the owner with role 'owner'", async () => {
    ownedBusiness = { id: "b1", owner_user_id: "u1" };
    const m = await getMembership("u1");
    expect(m).toMatchObject({ businessAccountId: "b1", role: "owner" });
  });

  it("resolves an active team member with their role", async () => {
    memberRow = { business_account_id: "b1", role: "finance", owner_user_id: "owner-1" };
    const m = await getMembership("u2");
    expect(m).toMatchObject({ businessAccountId: "b1", role: "finance" });
  });

  it("returns null for non-members", async () => {
    expect(await getMembership("u3")).toBeNull();
  });

  it("distribution allowed for owner/admin/finance/hr, denied for viewer/marketing", () => {
    for (const r of ["owner", "admin", "finance", "hr"]) expect(canDistribute(r)).toBe(true);
    for (const r of ["viewer", "marketing"]) expect(canDistribute(r)).toBe(false);
  });

  it("only owner/admin manage the team", () => {
    expect(() => assertCanManageTeam("owner")).not.toThrow();
    expect(() => assertCanManageTeam("admin")).not.toThrow();
    expect(() => assertCanManageTeam("finance")).toThrow(ForbiddenRoleError);
  });

  it("invite fails for unknown phone", async () => {
    await expect(inviteMember("b1", "u1", "+2340000000000", "viewer")).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("invite rejects the owner and existing active members", async () => {
    userByPhone = { id: "owner-1" };
    await expect(inviteMember("b1", "u1", "+2341111111111", "viewer")).rejects.toBeInstanceOf(AlreadyMemberError);

    userByPhone = { id: "u9" };
    existingMember = { id: "m1", status: "active" };
    await expect(inviteMember("b1", "u1", "+2342222222222", "viewer")).rejects.toBeInstanceOf(AlreadyMemberError);
  });

  it("invite inserts a new member row", async () => {
    userByPhone = { id: "u9" };
    const res = await inviteMember("b1", "u1", "+2343333333333", "hr");
    expect(res.memberId).toBe("m-new");
    expect(inserted).toHaveLength(1);
  });
});
