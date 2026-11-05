import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createApplicationSchema,
  headerOrder,
  overviewSearchParamsSchema,
} from "./schema";

const stageId = "6f1c2d1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";

function fieldErrors(input: Record<string, unknown>) {
  const result = createApplicationSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("createApplicationSchema", () => {
  it("accepts only company, role title, and stage", () => {
    expect(
      createApplicationSchema.parse({
        company: "  Acme ",
        roleTitle: "Developer",
        postingUrl: "",
        appliedOn: "",
        stageId,
      }),
    ).toEqual({ company: "Acme", roleTitle: "Developer", stageId });
  });

  it("treats missing optional fields as not provided", () => {
    expect(
      createApplicationSchema.parse({
        company: "Acme",
        roleTitle: "Developer",
        postingUrl: null,
        appliedOn: null,
        stageId,
      }),
    ).toEqual({ company: "Acme", roleTitle: "Developer", stageId });
  });

  it("accepts all fields", () => {
    expect(
      createApplicationSchema.parse({
        company: "Acme",
        roleTitle: "Developer",
        postingUrl: "https://acme.example/jobs/1",
        appliedOn: "2026-10-18",
        stageId,
      }),
    ).toEqual({
      company: "Acme",
      roleTitle: "Developer",
      postingUrl: "https://acme.example/jobs/1",
      appliedOn: "2026-10-18",
      stageId,
    });
  });

  it("reports each missing required field", () => {
    const errors = fieldErrors({ company: "  ", roleTitle: null, stageId });
    expect(errors.company).toEqual(["Company is required."]);
    expect(errors.roleTitle).toEqual(["Role title is required."]);
  });

  it("rejects text over 200 characters", () => {
    expect(
      fieldErrors({ company: "x".repeat(201), roleTitle: "Dev", stageId })
        .company,
    ).toBeDefined();
  });

  it.each([
    "not a url",
    "acme.example/jobs",
    "javascript:alert(1)",
    "ftp://acme.example",
    "data:text/html,hi",
  ])("rejects posting URL %j", (postingUrl) => {
    expect(
      fieldErrors({ company: "Acme", roleTitle: "Dev", postingUrl, stageId })
        .postingUrl,
    ).toEqual(["Enter a full http:// or https:// URL."]);
  });

  it.each(["2026-13-01", "18/10/2026", "yesterday"])(
    "rejects date %j",
    (appliedOn) => {
      expect(
        fieldErrors({ company: "Acme", roleTitle: "Dev", appliedOn, stageId })
          .appliedOn,
      ).toEqual(["Enter a valid date."]);
    },
  );

  it("requires a valid stage id", () => {
    expect(
      fieldErrors({ company: "Acme", roleTitle: "Dev", stageId: "" }).stageId,
    ).toEqual(["Choose a stage."]);
  });
});

describe("overviewSearchParamsSchema", () => {
  it("uses the default order when no params are given", () => {
    expect(overviewSearchParamsSchema.parse({})).toEqual({ dir: "asc" });
  });

  it.each(["company", "role_title", "stage", "status", "applied_on"] as const)(
    "accepts sort=%s",
    (sort) => {
      expect(overviewSearchParamsSchema.parse({ sort, dir: "desc" })).toEqual({
        sort,
        dir: "desc",
      });
    },
  );

  it("ignores params it doesn't know", () => {
    expect(
      overviewSearchParamsSchema.parse({ sort: "company", page: "2" }),
    ).toEqual({ sort: "company", dir: "asc" });
  });

  it.each([
    ["an unknown column", { sort: "user_id", dir: "desc" }, { dir: "desc" }],
    [
      "an unknown direction",
      { sort: "company", dir: "up" },
      { sort: "company", dir: "asc" },
    ],
    ["a repeated column", { sort: ["company", "stage"] }, { dir: "asc" }],
    [
      "a repeated direction",
      { sort: "stage", dir: ["asc", "desc"] },
      { sort: "stage", dir: "asc" },
    ],
    ["different casing", { sort: "Company", dir: "DESC" }, { dir: "asc" }],
  ])("falls back to the default for %s", (_, params, expected) => {
    expect(overviewSearchParamsSchema.parse(params)).toEqual(expected);
  });
});

describe("headerOrder", () => {
  it("sorts a new column ascending", () => {
    expect(headerOrder("company", { dir: "asc" })).toEqual({
      sort: "company",
      dir: "asc",
    });
    expect(headerOrder("stage", { sort: "company", dir: "desc" })).toEqual({
      sort: "stage",
      dir: "asc",
    });
  });

  it("reverses the current column", () => {
    expect(headerOrder("company", { sort: "company", dir: "asc" })).toEqual({
      sort: "company",
      dir: "desc",
    });
    expect(headerOrder("company", { sort: "company", dir: "desc" })).toEqual({
      sort: "company",
      dir: "asc",
    });
  });
});
