import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApplicationSchema } from "./schema";

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
