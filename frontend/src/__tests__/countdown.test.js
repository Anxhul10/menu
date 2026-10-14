import { describe, expect, it } from "vitest";
import { formatCountdown, remainingSeconds } from "../utils/countdown";

describe("batch countdown", () => {
  it("derives remaining time from a persisted deadline", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    expect(remainingSeconds("2026-01-01T00:10:05.000Z", now)).toBe(605);
    expect(formatCountdown(605)).toBe("10:05");
    expect(remainingSeconds("2025-12-31T23:59:00.000Z", now)).toBe(0);
  });
});
