import { afterEach, describe, expect, it, vi } from "vitest";
import { mocksEnabled, mockDisabledResponse } from "./mockGuard";

// The mock endpoints self-deliver signed webhooks to the real credit path, so
// "reachable in production" == "anyone can fund their own wallet". These tests
// are the regression guard the security contract (Appendix B) requires.
describe("mockGuard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks mocks in production when ENABLE_MOCKS is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCKS", "");
    expect(mocksEnabled()).toBe(false);
    expect(mockDisabledResponse()?.status).toBe(404);
  });

  it("blocks mocks in production even when a provider key is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCKS", "");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_something");
    expect(mockDisabledResponse()?.status).toBe(404);
  });

  it("allows mocks in production only when ENABLE_MOCKS=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCKS", "true");
    expect(mocksEnabled()).toBe(true);
    expect(mockDisabledResponse()).toBeNull();
  });

  it("allows mocks outside production (dev/test)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_MOCKS", "");
    expect(mocksEnabled()).toBe(true);
    expect(mockDisabledResponse()).toBeNull();
  });
});
