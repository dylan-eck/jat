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

// Overview sorting from the URL (?sort=applied_on&dir=desc). Unknown or
// repeated values fall back to the default instead of erroring, since
// anyone can edit the URL. Without `sort`, the newest applications come first.
export const sortColumns = [
  "company",
  "role_title",
  "stage",
  "status",
  "applied_on",
] as const;

export type SortColumn = (typeof sortColumns)[number];

export const overviewSearchParamsSchema = z.object({
  sort: z.enum(sortColumns).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).default("asc").catch("asc"),
});

export type OverviewOrder = z.infer<typeof overviewSearchParamsSchema>;

// The order a column header links to: ascending first, then reversed on each
// click.
export function headerOrder(
  column: SortColumn,
  current: OverviewOrder,
): OverviewOrder {
  if (current.sort !== column) {
    return { sort: column, dir: "asc" };
  }
  return { sort: column, dir: current.dir === "asc" ? "desc" : "asc" };
}
