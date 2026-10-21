import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Neon Auth owns the neon_auth schema. Only the columns we reference are
// declared, and this file is not in drizzle.config.ts's schema list, so
// drizzle-kit never generates migrations for it.
export const neonAuthUser = pgSchema("neon_auth").table("user", {
  id: uuid("id").primaryKey(),
});
