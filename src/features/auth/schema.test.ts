import { describe, expect, it } from "vitest";
import { magicLinkSchema } from "./schema";

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
