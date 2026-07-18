import { describe, it, expect, vi, beforeEach } from "vitest";

let sendingLocked = false;
const sendNotificationMock = vi.fn(async () => true);

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/send", () => ({ sendNotification: (...a: unknown[]) => sendNotificationMock(...(a as [])) }));
vi.mock("@/lib/db", () => ({
  query: async (sql: string) => {
    if (sql.includes("SET status = 'sending'")) {
      if (sendingLocked) return { rowCount: 0, rows: [] };
      sendingLocked = true;
      return { rowCount: 1, rows: [{ schedule_type: "immediate" }] };
    }
    if (sql.includes("SELECT id FROM notification_campaigns WHERE id")) return { rows: [{ id: "camp1" }] };
    if (sql.startsWith("SELECT * FROM notification_campaigns")) {
      return {
        rows: [{ id: "camp1", subject: "Hi", body: "Body", channels: ["push"], audience: "all", audience_meta: null, schedule_type: "immediate" }],
      };
    }
    if (sql.includes("SELECT id FROM users")) return { rows: [{ id: "u1" }, { id: "u2" }] };
    if (sql.includes("UPDATE notification_campaigns SET status = $2")) {
      sendingLocked = false; // lock released
      return { rowCount: 1, rows: [] };
    }
    return { rows: [], rowCount: 0 };
  },
}));

const { sendCampaignNow } = await import("./campaigns");

describe("sendCampaignNow double-blast guard", () => {
  beforeEach(() => {
    sendingLocked = false;
    sendNotificationMock.mockClear();
  });

  it("sends to the resolved audience once and releases the lock", async () => {
    const r = await sendCampaignNow("camp1", "admin");
    expect(r.recipients).toBe(2);
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendingLocked).toBe(false); // released in finally
  });

  it("skips when a send is already in flight (no second blast)", async () => {
    sendingLocked = true; // simulate an in-flight send holding the lock
    const r = await sendCampaignNow("camp1", "admin");
    expect(r.skipped).toBe(true);
    expect(r.recipients).toBe(0);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
