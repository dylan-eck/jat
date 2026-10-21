import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const applicationStatus = pgEnum("application_status", [
  "active",
  "closed",
]);

export const closeReason = pgEnum("close_reason", [
  "accepted_offer",
  "rejected",
  "withdrawn",
  "ghosted",
]);

export const workArrangement = pgEnum("work_arrangement", [
  "onsite",
  "hybrid",
  "remote",
]);

// Resume, cover letter, and next action columns arrive with documents and
// follow-ups (US-12, US-16).
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    roleTitle: text("role_title").notNull(),
    postingUrl: text("posting_url"),
    appliedOn: date("applied_on"),
    status: applicationStatus("status").notNull().default("active"),
    closeReason: closeReason("close_reason"),
    stageId: uuid("stage_id").notNull(),
    location: text("location"),
    workArrangement: workArrangement("work_arrangement"),
    salary: text("salary"),
    contact: text("contact"),
    notes: text("notes"),
    // Bumped by history.ts on real changes (US-17).
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (t) => [
    // Target of composite foreign keys from history and interviews.
    unique("applications_id_user_id_key").on(t.id, t.userId),
    // Including user_id means a stage can only be referenced by its owner.
    foreignKey({
      name: "applications_stage_id_user_id_fk",
      columns: [t.stageId, t.userId],
      foreignColumns: [stages.id, stages.userId],
    }).onDelete("restrict"),
    index("applications_user_id_stage_id_idx").on(t.userId, t.stageId),
    check(
      "applications_company_check",
      sql`char_length(${t.company}) between 1 and 200`,
    ),
    check(
      "applications_role_title_check",
      sql`char_length(${t.roleTitle}) between 1 and 200`,
    ),
    // http(s) only, so a stored link can never be javascript: or data:.
    check(
      "applications_posting_url_check",
      sql`${t.postingUrl} ~* '^https?://' and char_length(${t.postingUrl}) <= 2048`,
    ),
    check(
      "applications_close_reason_check",
      sql`${t.status} = 'closed' or ${t.closeReason} is null`,
    ),
  ],
);

// Stage and status history. Rows are written only in the same transaction as
// the application change they describe (see history.ts), and never updated.
export const applicationEvents = pgTable(
  "application_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Name snapshots, not FKs, so renaming or deleting a stage never rewrites
    // history.
    fromStageName: text("from_stage_name"),
    toStageName: text("to_stage_name"),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status"),
    closeReason: closeReason("close_reason"),
  },
  (t) => [
    foreignKey({
      name: "application_events_application_id_user_id_fk",
      columns: [t.applicationId, t.userId],
      foreignColumns: [applications.id, applications.userId],
    }).onDelete("cascade"),
    index("application_events_application_id_idx").on(
      t.applicationId,
      t.occurredAt,
    ),
  ],
);
