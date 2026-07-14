import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, RateLimitExceededError } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    expect(() => checkRateLimit(key, 3, 1000)).not.toThrow();
    expect(() => checkRateLimit(key, 3, 1000)).not.toThrow();
    expect(() => checkRateLimit(key, 3, 1000)).not.toThrow();
  });

  it("rejects the request that exceeds the limit", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 2, 1000);
    checkRateLimit(key, 2, 1000);
    expect(() => checkRateLimit(key, 2, 1000)).toThrow(RateLimitExceededError);
  });

  it("allows requests again once the window has passed", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 1000);
    expect(() => checkRateLimit(key, 1, 1000)).toThrow(RateLimitExceededError);

    vi.setSystemTime(1001);
    expect(() => checkRateLimit(key, 1, 1000)).not.toThrow();
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    checkRateLimit(keyA, 1, 1000);
    expect(() => checkRateLimit(keyA, 1, 1000)).toThrow(RateLimitExceededError);
    expect(() => checkRateLimit(keyB, 1, 1000)).not.toThrow();
  });
});
