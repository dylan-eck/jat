import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
});

// Only same-origin paths, so the callback can't be used as an open redirect.
// Rejects protocol-relative ("//evil.com") and backslash ("/\evil.com") forms.
export const nextPathSchema = z
  .string()
  .regex(/^\/(?![/\\])/)
  .catch("/");
