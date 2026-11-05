import { describe, expect, it } from "vitest";
import { migrationUrl } from "./migration-url";

const unpooled = "postgres://direct";
const pooled = "postgres://pooled";

describe("migrationUrl", () => {
  it("prefers the unpooled connection", () => {
    expect(
      migrationUrl({ DATABASE_URL_UNPOOLED: unpooled, DATABASE_URL: pooled }),
    ).toBe(unpooled);
  });

  it("falls back to the pooled connection, including when unpooled is empty", () => {
    expect(migrationUrl({ DATABASE_URL: pooled })).toBe(pooled);
    expect(
      migrationUrl({ DATABASE_URL_UNPOOLED: "", DATABASE_URL: pooled }),
    ).toBe(pooled);
  });

  it("returns an empty url off Vercel, so generate works without a database", () => {
    expect(migrationUrl({})).toBe("");
  });

  it("points a preview build at the Neon integration", () => {
    expect(() => migrationUrl({ VERCEL: "1", VERCEL_ENV: "preview" })).toThrow(
      /Neon Vercel integration/,
    );
  });

  it("points a production build at the project settings", () => {
    expect(() =>
      migrationUrl({ VERCEL: "1", VERCEL_ENV: "production" }),
    ).toThrow(/production environment.*Vercel project settings/);
  });
});
