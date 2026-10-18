// Resolve a post-sign-in `next` path against the app's origin, falling back to
// "/" unless the result stays on that origin. Checking the resolved URL rather
// than the raw string matters: the URL parser strips tabs and newlines, so
// "/\t/evil.example" becomes "//evil.example" (another host).
export function resolveNextUrl(next: string | null, origin: string): URL {
  const fallback = new URL("/", origin);
  if (!next?.startsWith("/")) {
    return fallback;
  }
  try {
    const url = new URL(next, origin);
    return url.origin === fallback.origin ? url : fallback;
  } catch {
    return fallback;
  }
}

const loginErrorMessages = new Map([
  ["callback", "That sign-in link is invalid or expired. Request a new one."],
  ["github", "Couldn't start GitHub sign-in. Try again."],
]);

// A Map lookup, so keys like "__proto__" can't reach Object.prototype.
export function loginErrorMessage(error: unknown): string | undefined {
  return typeof error === "string" ? loginErrorMessages.get(error) : undefined;
}
