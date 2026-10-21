CREATE TYPE "public"."application_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."close_reason" AS ENUM('accepted_offer', 'rejected', 'withdrawn', 'ghosted');--> statement-breakpoint
CREATE TYPE "public"."work_arrangement" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_stage_name" text,
	"to_stage_name" text,
	"from_status" "application_status",
	"to_status" "application_status",
	"close_reason" "close_reason"
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"posting_url" text,
	"applied_on" date,
	"status" "application_status" DEFAULT 'active' NOT NULL,
	"close_reason" "close_reason",
	"stage_id" uuid NOT NULL,
	"location" text,
	"work_arrangement" "work_arrangement",
	"salary" text,
	"contact" text,
	"notes" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "applications_company_check" CHECK (char_length("applications"."company") between 1 and 200),
	CONSTRAINT "applications_role_title_check" CHECK (char_length("applications"."role_title") between 1 and 200),
	CONSTRAINT "applications_posting_url_check" CHECK ("applications"."posting_url" ~* '^https?://' and char_length("applications"."posting_url") <= 2048),
	CONSTRAINT "applications_close_reason_check" CHECK ("applications"."status" = 'closed' or "applications"."close_reason" is null)
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_user_id_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "public"."applications"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_stage_id_user_id_fk" FOREIGN KEY ("stage_id","user_id") REFERENCES "public"."stages"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_application_id_idx" ON "application_events" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE INDEX "applications_user_id_stage_id_idx" ON "applications" USING btree ("user_id","stage_id");