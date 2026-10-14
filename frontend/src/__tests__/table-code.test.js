import { describe, expect, it } from "vitest";
import { isValidTableCode, parseMenuQrValue } from "../utils/tableCode";

describe("table code validation", () => {
  it("accepts secure public tokens and rejects predictable short values", () => {
    expect(isValidTableCode("a".repeat(43))).toBe(true);
    expect(isValidTableCode("table-1")).toBe(false);
  });

  it("accepts the expected Menu table URL and rejects arbitrary URLs", () => {
    const token = "a".repeat(43);
    expect(
      parseMenuQrValue(`${window.location.origin}/r/green-leaf/t/${token}`),
    ).toMatchObject({
      slug: "green-leaf",
      token,
    });
    expect(
      parseMenuQrValue(`https://example.com/r/green-leaf/t/${token}`),
    ).toBeNull();
  });
});
