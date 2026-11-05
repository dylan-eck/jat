type Env = Record<string, string | undefined>;

// The connection string drizzle-kit migrates with: the direct (unpooled)
// connection, falling back to the pooled one. On Vercel, a missing value is
// a provisioning problem, so fail with a message that says where to look
// instead of drizzle-kit's bare `url: ''`.
export function migrationUrl(env: Env): string {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "";
  if (url || !env.VERCEL) {
    return url;
  }
  if (env.VERCEL_ENV === "preview") {
    throw new Error(
      "DATABASE_URL_UNPOOLED and DATABASE_URL are empty. The Neon Vercel " +
        "integration sets them for each preview when it creates the " +
        "preview's Neon branch, so it didn't provision this one. Check the " +
        "Neon console for the preview/<git-branch> branch (and the project's " +
        "branch limit), then redeploy.",
    );
  }
  throw new Error(
    `DATABASE_URL_UNPOOLED and DATABASE_URL are empty in the ${env.VERCEL_ENV ?? "unknown"} ` +
      "environment. Set them in the Vercel project settings from the " +
      "production Neon branch.",
  );
}
