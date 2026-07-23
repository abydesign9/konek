import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// The adapter reads credentials at call time, so set them before importing.
process.env.ESIM_ACCESS_ACCESS_CODE = "test-access-code";
process.env.ESIM_ACCESS_SECRET_KEY = "test-secret";

const { esimAccessAdapter, esimAccessProvider } = await import("./esimAccess");
const { __resetCircuitBreakers } = await import("@/lib/http/resilientHttp");

// Captures the last request so we can assert on the outgoing contract.
let lastCall: { url: string; body: unknown; headers: Record<string, string> } | null = null;

function stubFetch(responder: (url: string, body: Record<string, unknown>) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body ?? "{}"));
      lastCall = { url, body, headers: init.headers as Record<string, string> };
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify(responder(url, body)),
      } as unknown as Response;
    })
  );
}

beforeEach(() => {
  lastCall = null;
  __resetCircuitBreakers();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("eSIM Access adapter", () => {
  it("authenticates with the RT-AccessCode header", async () => {
    stubFetch(() => ({ success: true, errorCode: null, obj: { balance: 1230000 } }));
    await esimAccessAdapter.balance();
    expect(lastCall?.headers["RT-AccessCode"]).toBe("test-access-code");
    // Signing is opt-in and off by default.
    expect(lastCall?.headers["RT-Signature"]).toBeUndefined();
  });

  it("converts their price unit (value * 10,000) to USD cents", async () => {
    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: {
        packageList: [
          {
            packageCode: "CKH139",
            slug: "SI_5_30",
            name: "Slovenia 5GB 30Days",
            price: 112500, // $11.25
            retailPrice: 150000, // $15.00
            currencyCode: "USD",
            volume: 5368709120, // 5GB
            duration: 30,
            durationUnit: "DAY",
            location: "SI",
          },
        ],
      },
    }));

    const plans = await esimAccessAdapter.listPlans!("esim");
    expect(plans).toHaveLength(1);
    expect(plans[0].externalId).toBe("SI_5_30"); // prefers slug
    expect(plans[0].costMinor).toBe(1125); // $11.25
    expect(plans[0].priceMinor).toBe(1500); // suggested retail $15.00
    expect(plans[0].currency).toBe("USD");
    expect(plans[0].meta?.dataMb).toBe(5120);
    expect(plans[0].meta?.type).toBe("country");
  });

  it("classifies multi-country packs as region and marks single-country as country", async () => {
    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: {
        packageList: [
          { packageCode: "A", name: "Asia", price: 10000, currencyCode: "USD", volume: 1024, duration: 7, durationUnit: "DAY", location: "CN,HK,JP,SG" },
        ],
      },
    }));
    const plans = await esimAccessAdapter.listPlans!("esim");
    expect(plans[0].meta?.type).toBe("region");
  });

  it("orders with our txn id as transactionId and returns pending while profiles allocate", async () => {
    stubFetch((url) => {
      if (url.includes("/esim/order")) return { success: true, errorCode: null, obj: { orderNo: "B123" } };
      // Profiles not ready yet.
      return { success: false, errorCode: "200010", errorMsg: "allocating", obj: null };
    });

    const res = await esimAccessAdapter.purchase({
      reference: "txn-abc",
      serviceType: "esim",
      planExternalId: "SI_5_30",
      amountMinor: 500000,
    });

    expect(res.status).toBe("pending");
    expect(res.vendorRef).toBe("B123");
  });

  it("returns delivered with the LPA activation code once a profile exists", async () => {
    stubFetch((url) => {
      if (url.includes("/esim/order")) return { success: true, errorCode: null, obj: { orderNo: "B999" } };
      return {
        success: true,
        errorCode: null,
        obj: { esimList: [{ esimTranNo: "T1", orderNo: "B999", iccid: "8988", ac: "LPA:1$rsp.example.com$MATCH1" }] },
      };
    });

    const res = await esimAccessAdapter.purchase({
      reference: "txn-xyz",
      serviceType: "esim",
      planExternalId: "SI_5_30",
      amountMinor: 500000,
    });

    expect(res.status).toBe("delivered");
    expect(res.token).toBe("LPA:1$rsp.example.com$MATCH1");
  });

  it("treats 'still allocating' as pending and an unknown order as failed on verify", async () => {
    stubFetch(() => ({ success: false, errorCode: "200010", errorMsg: "allocating", obj: null }));
    expect((await esimAccessAdapter.verify("B123")).status).toBe("pending");

    stubFetch(() => ({ success: false, errorCode: "310272", errorMsg: "no such order", obj: null }));
    expect((await esimAccessAdapter.verify("B404")).status).toBe("failed");
  });

  it("never reports a failed purchase when the order succeeded (funds must stay held)", async () => {
    stubFetch((url) => {
      if (url.includes("/esim/order")) return { success: true, errorCode: null, obj: { orderNo: "B777" } };
      return { success: false, errorCode: "900001", errorMsg: "system busy", obj: null };
    });
    const res = await esimAccessAdapter.purchase({
      reference: "t",
      serviceType: "esim",
      planExternalId: "X",
      amountMinor: 1,
    });
    expect(res.status).toBe("pending");
  });

  it("fails cleanly when no plan is supplied", async () => {
    stubFetch(() => ({ success: true, errorCode: null, obj: {} }));
    const res = await esimAccessAdapter.purchase({ reference: "t", serviceType: "esim", amountMinor: 1 });
    expect(res.status).toBe("failed");
  });
});

describe("eSIM Access provider (post-issuance reads)", () => {
  it("maps usage bytes to MB and IN_USE to active", async () => {
    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: {
        esimList: [
          {
            esimTranNo: "T",
            orderNo: "B",
            iccid: "8988",
            esimStatus: "IN_USE",
            smdpStatus: "ENABLED",
            totalVolume: 1073741824, // 1GB
            orderUsage: 536870912, // 0.5GB
            expiredTime: "2026-05-29T18:34:17+0000",
          },
        ],
      },
    }));

    const usage = await esimAccessProvider.getUsage("8988");
    expect(usage.status).toBe("active");
    expect(usage.totalMb).toBe(1024);
    expect(usage.usedMb).toBe(512);
    expect(usage.remainingMb).toBe(512);
  });

  it("parses the LPA string into SM-DP+ address and matching id", async () => {
    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: { esimList: [{ esimTranNo: "T", orderNo: "B", iccid: "8988", ac: "LPA:1$rsp-eu.redteamobile.com$451F98" }] },
    }));

    const act = await esimAccessProvider.getActivation("8988");
    expect(act.smdpAddress).toBe("rsp-eu.redteamobile.com");
    expect(act.matchingId).toBe("451F98");
    expect(act.lpaString).toBe("LPA:1$rsp-eu.redteamobile.com$451F98");
  });

  it("maps depleted and expired lifecycle states", async () => {
    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: { esimList: [{ esimTranNo: "T", orderNo: "B", iccid: "1", esimStatus: "USED_UP", totalVolume: 100, orderUsage: 100 }] },
    }));
    expect((await esimAccessProvider.getUsage("1")).status).toBe("depleted");

    stubFetch(() => ({
      success: true,
      errorCode: null,
      obj: { esimList: [{ esimTranNo: "T", orderNo: "B", iccid: "1", esimStatus: "UNUSED_EXPIRED" }] },
    }));
    expect((await esimAccessProvider.getUsage("1")).status).toBe("expired");
  });
});
