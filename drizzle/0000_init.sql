CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"time_zone" text,
	"stale_after_days" integer DEFAULT 14 NOT NULL,
	CONSTRAINT "profiles_stale_after_days_check" CHECK ("profiles"."stale_after_days" between 1 and 365)
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "stages_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "stages_name_check" CHECK (char_length("stages"."name") between 1 and 50)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stages_user_id_lower_name_key" ON "stages" USING btree ("user_id",lower("name"));