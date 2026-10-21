import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export type ActionFailure = Extract<ActionResult, { ok: false }>;

export function invalidInput(error: z.ZodError): ActionFailure {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    fieldErrors: fieldErrors as Record<string, string[]>,
    formError: formErrors[0],
  };
}

// Messages for the Postgres error codes the app expects. Anything else gets a
// generic message, so database details never reach the browser.
const postgresMessages = new Map([
  // FK violation on insert/update. Also covers another user's stage or
  // document, without revealing that it exists.
  ["23503", "Invalid stage or document. Reload the page and try again."],
  ["23505", "A stage with that name already exists."],
  ["23514", "Some values are invalid. Check the form and try again."],
  ["42501", "You don't have permission to do that."],
]);

export const genericError = "Something went wrong. Try again.";

// Drizzle wraps pg errors, so the code is on the cause.
function postgresCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { cause, code } = error as { cause?: unknown; code?: unknown };
  const causeCode = (cause as { code?: unknown } | undefined)?.code;
  if (typeof causeCode === "string") {
    return causeCode;
  }
  return typeof code === "string" ? code : undefined;
}

export function mapPostgresError(error: unknown): ActionFailure {
  return {
    ok: false,
    formError: postgresMessages.get(postgresCode(error) ?? "") ?? genericError,
  };
}
