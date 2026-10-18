import { describe, expect, it } from "vitest";
import { loginErrorMessage, resolveNextUrl } from "./redirect";

const origin = "http://localhost:3000";

describe("resolveNextUrl", () => {
  it("keeps same-origin paths", () => {
    expect(resolveNextUrl("/applications?x=1", origin).href).toBe(
      "http://localhost:3000/applications?x=1",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    null,
  ])("falls back to / for %j", (next) => {
    expect(resolveNextUrl(next, origin).href).toBe("http://localhost:3000/");
  });
});

describe("loginErrorMessage", () => {
  it("returns the message for a known code", () => {
    expect(loginErrorMessage("callback")).toMatch(/invalid or expired/);
  });

  it.each([
    "__proto__",
    "constructor",
    "toString",
    "nope",
    undefined,
    ["callback"],
  ])("returns undefined for %j", (error) => {
    expect(loginErrorMessage(error)).toBeUndefined();
  });
});
