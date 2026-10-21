import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { neonAuthUser } from "./neon-auth";

// Every table has a user_id. Ownership is enforced in queries.ts/actions.ts
// (every query filters on the signed-in user's id); these constraints are the
// safety net for references between rows.

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    // IANA name, validated with Zod. Null until the browser reports it.
    timeZone: text("time_zone"),
    staleAfterDays: integer("stale_after_days").notNull().default(14),
  },
  (t) => [
    check(
      "profiles_stale_after_days_check",
      sql`${t.staleAfterDays} between 1 and 365`,
    ),
  ],
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    // Target of composite foreign keys, so a stage can only be referenced by
    // rows with the same owner.
    unique("stages_id_user_id_key").on(t.id, t.userId),
    uniqueIndex("stages_user_id_lower_name_key").on(
      t.userId,
      sql`lower(${t.name})`,
    ),
    check("stages_name_check", sql`char_length(${t.name}) between 1 and 50`),
  ],
);
