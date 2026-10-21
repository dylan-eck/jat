import { z } from "zod";

// Form fields arrive as strings, or null when missing; treat blank and
// missing ones as not provided.
function blankToUndefined(value: unknown) {
  return value === null || (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;
}

function requiredText(label: string) {
  return z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .min(1, `${label} is required.`)
      .max(200, `${label} must be at most 200 characters.`),
  );
}

export const createApplicationSchema = z.object({
  company: requiredText("Company"),
  roleTitle: requiredText("Role title"),
  postingUrl: z.preprocess(
    blankToUndefined,
    z
      .url({
        protocol: /^https?$/,
        error: "Enter a full http:// or https:// URL.",
      })
      .max(2048, "URL must be at most 2048 characters.")
      .optional(),
  ),
  appliedOn: z.preprocess(
    blankToUndefined,
    z.iso.date("Enter a valid date.").optional(),
  ),
  stageId: z.uuid("Choose a stage."),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
