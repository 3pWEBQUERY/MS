CREATE SCHEMA "analytics";
--> statement-breakpoint
CREATE TYPE "analytics"."event_name" AS ENUM('onboarding_completed', 'moment_path_selected', 'useful_action_completed', 'core_flow_failed', 'preference_changed');--> statement-breakpoint
ALTER TYPE "privacy"."request_type" ADD VALUE 'mfa_recovery';--> statement-breakpoint
CREATE TABLE "ops"."worker_heartbeats" (
	"name" text PRIMARY KEY NOT NULL,
	"beat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alarms" text,
	"alarms_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "analytics"."cohort_days" (
	"day" date PRIMARY KEY NOT NULL,
	"entered" integer NOT NULL,
	"activated_7d" integer NOT NULL,
	"activated_by_type" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active_week4" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" uuid NOT NULL,
	"name" "analytics"."event_name" NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"day" date NOT NULL,
	"dedupe" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."subjects" (
	"ref" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subjects_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "identity"."accounts" ADD COLUMN "inactivity_notice_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "community"."groups" ADD COLUMN "rules_change_note" text;--> statement-breakpoint
ALTER TABLE "analytics"."events" ADD CONSTRAINT "events_ref_subjects_ref_fk" FOREIGN KEY ("ref") REFERENCES "analytics"."subjects"("ref") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics"."subjects" ADD CONSTRAINT "subjects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_events_dedupe_uq" ON "analytics"."events" USING btree ("ref","day","dedupe");--> statement-breakpoint
CREATE INDEX "analytics_events_name_day_idx" ON "analytics"."events" USING btree ("name","day");--> statement-breakpoint
ALTER TABLE "health"."diary_entries" ADD CONSTRAINT "diary_entries_fatigue_value" CHECK ("health"."diary_entries"."kind" <> 'fatigue' or "health"."diary_entries"."fatigue" is not null);