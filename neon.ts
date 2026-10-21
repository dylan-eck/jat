import { defineConfig } from "@neon/config/v1";

// Services every branch gets. Apply with `neon deploy`; new branches (previews,
// CI, `neon checkout <name> --create`) get them when they are created.
export default defineConfig({
  auth: true,
  buckets: {
    // Resume and cover letter PDFs (US-12). Private: served via presigned URLs.
    documents: { access: "private" },
  },
  branch: (branch) => {
    // Production, and the long-lived local development branch, never expire.
    if (branch.isDefault || branch.name === "dev") {
      return {};
    }
    // New preview and CI branches expire after a week.
    if (!branch.exists) {
      return { ttl: "7d" };
    }
    // Existing branches are left as they are.
    return {};
  },
});
