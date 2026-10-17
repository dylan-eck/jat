import { describe, expect, it } from "vitest";
import { magicLinkSchema, nextPathSchema } from "./schema";

describe("magicLinkSchema", () => {
  it("trims and lowercases the email", () => {
    expect(magicLinkSchema.parse({ email: "  Me@Example.COM " })).toEqual({
      email: "me@example.com",
    });
  });

  it("rejects an invalid email", () => {
    expect(magicLinkSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects a missing email", () => {
    expect(magicLinkSchema.safeParse({ email: null }).success).toBe(false);
  });
});

describe("nextPathSchema", () => {
  it("keeps same-origin paths", () => {
    expect(nextPathSchema.parse("/applications?x=1")).toBe("/applications?x=1");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "evil.com",
    "",
    null,
  ])("falls back to / for %j", (value) => {
    expect(nextPathSchema.parse(value)).toBe("/");
  });
});
