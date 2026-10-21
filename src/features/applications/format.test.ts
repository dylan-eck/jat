import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it.each([
    ["2026-10-18", "Oct 18, 2026"],
    ["2026-01-01", "Jan 1, 2026"],
    ["2026-12-31", "Dec 31, 2026"],
  ])("formats %s as %s on its calendar day", (value, expected) => {
    expect(formatDate(value)).toBe(expected);
  });
});
