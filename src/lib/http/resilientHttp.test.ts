import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/vendors/providerMetrics", () => ({ recordProviderCall: vi.fn(async () => {}) }));

import {
  resilientRequest,
  __resetCircuitBreakers,
  ProviderHttpError,
  ProviderTimeoutError,
  ProviderNetworkError,
  CircuitOpenError,
} from "./resilientHttp";
import { recordProviderCall } from "@/lib/vendors/providerMetrics";

function okResponse(body: string, status = 200) {
  return { status, ok: status >= 200 && status < 300, text: async () => body } as unknown as Response;
}

describe("resilientRequest", () => {
  beforeEach(() => {
    __resetCircuitBreakers();
    vi.clearAllMocks();
  });

  it("returns parsed JSON on success and records a success metric", async () => {
    const fetchImpl = vi.fn(async () => okResponse(JSON.stringify({ hi: 1 })));
    const res = await resilientRequest({ provider: "p1", operation: "purchase", url: "http://x", fetchImpl });
    expect(res.json<{ hi: number }>()).toEqual({ hi: 1 });
    expect(recordProviderCall).toHaveBeenCalledWith(expect.objectContaining({ outcome: "success" }));
  });

  it("retries a retryable 503 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse("busy", 503))
      .mockResolvedValueOnce(okResponse(JSON.stringify({ ok: true })));
    const res = await resilientRequest({ provider: "p2", operation: "purchase", url: "http://x", retries: 1, fetchImpl });
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws ProviderHttpError on a non-retryable 4xx", async () => {
    const fetchImpl = vi.fn(async () => okResponse("bad", 400));
    await expect(
      resilientRequest({ provider: "p3", operation: "purchase", url: "http://x", retries: 0, fetchImpl })
    ).rejects.toBeInstanceOf(ProviderHttpError);
  });

  it("maps an aborted request to ProviderTimeoutError", async () => {
    const fetchImpl = vi.fn(async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    });
    await expect(
      resilientRequest({ provider: "p4", operation: "verify", url: "http://x", retries: 0, fetchImpl })
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it("maps a network failure to ProviderNetworkError", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(
      resilientRequest({ provider: "p5", operation: "verify", url: "http://x", retries: 0, fetchImpl })
    ).rejects.toBeInstanceOf(ProviderNetworkError);
  });

  it("opens the circuit after repeated failures and then fails fast", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    // 5 consecutive failures trip the breaker.
    for (let i = 0; i < 5; i++) {
      await expect(
        resilientRequest({ provider: "flaky", operation: "purchase", url: "http://x", retries: 0, fetchImpl })
      ).rejects.toBeInstanceOf(ProviderNetworkError);
    }
    // 6th call short-circuits without calling fetch.
    const callsBefore = fetchImpl.mock.calls.length;
    await expect(
      resilientRequest({ provider: "flaky", operation: "purchase", url: "http://x", retries: 0, fetchImpl })
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fetchImpl.mock.calls.length).toBe(callsBefore); // fetch not invoked
    expect(recordProviderCall).toHaveBeenCalledWith(expect.objectContaining({ outcome: "circuit_open" }));
  });

  it("recovers after the cooldown: half-open trial succeeds and closes the breaker", async () => {
    // Fake only the clock so the breaker's 30s cooldown can be advanced without
    // faking setTimeout (the abort timer stays real).
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const down = vi.fn(async () => {
        throw new Error("down");
      });
      for (let i = 0; i < 5; i++) {
        await expect(
          resilientRequest({ provider: "recov", operation: "purchase", url: "http://x", retries: 0, fetchImpl: down })
        ).rejects.toBeInstanceOf(ProviderNetworkError);
      }
      // Open: fails fast.
      await expect(
        resilientRequest({ provider: "recov", operation: "purchase", url: "http://x", retries: 0, fetchImpl: down })
      ).rejects.toBeInstanceOf(CircuitOpenError);

      // Advance past the 30s cooldown → half-open trial allowed; a success closes it.
      vi.setSystemTime(Date.now() + 31_000);
      const up = vi.fn(async () => okResponse(JSON.stringify({ ok: true })));
      const res = await resilientRequest({ provider: "recov", operation: "purchase", url: "http://x", retries: 0, fetchImpl: up });
      expect(res.ok).toBe(true);
      expect(up).toHaveBeenCalledTimes(1); // the half-open trial actually ran
    } finally {
      vi.useRealTimers();
    }
  });
});
