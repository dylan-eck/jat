import { describe, expect, it } from "vitest";
import { z } from "zod";
import { genericError, invalidInput, mapPostgresError } from "./action-result";

describe("mapPostgresError", () => {
  it.each([
    ["23503", /invalid stage or document/i],
    ["23505", /already exists/i],
    ["23514", /invalid/i],
    ["42501", /permission/i],
  ])("maps %s to a friendly message", (code, message) => {
    const result = mapPostgresError({ code });
    expect(result.ok).toBe(false);
    expect(result.formError).toMatch(message);
  });

  it("reads the code from a wrapped driver error", () => {
    const error = new Error("Failed query", { cause: { code: "23503" } });
    expect(mapPostgresError(error).formError).toMatch(/invalid stage/i);
  });

  it.each([
    { code: "XX000" },
    { code: "__proto__" },
    { code: "" },
    {},
    null,
    new Error("no code"),
  ])("falls back to a generic message for %j", (error) => {
    expect(mapPostgresError(error).formError).toBe(genericError);
  });
});

describe("invalidInput", () => {
  it("returns field errors keyed by field", () => {
    const schema = z.object({ a: z.string().min(1, "A is required.") });
    const parsed = schema.safeParse({ a: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(invalidInput(parsed.error)).toEqual({
      ok: false,
      fieldErrors: { a: ["A is required."] },
      formError: undefined,
    });
  });
});
