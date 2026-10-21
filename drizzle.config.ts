import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load env files itself. CI and Vercel set the variables
// directly, so a missing .env.local is fine.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  // Migrations use the direct (unpooled) connection; the app uses the pooled
  // one. Only migrate and studio connect; generate works without a database.
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  // neon_auth belongs to Neon Auth; never diff or migrate it.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
