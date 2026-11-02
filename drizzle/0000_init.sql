CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE SCHEMA "health";
--> statement-breakpoint
CREATE SCHEMA "community";
--> statement-breakpoint
CREATE SCHEMA "messaging";
--> statement-breakpoint
CREATE SCHEMA "content";
--> statement-breakpoint
CREATE SCHEMA "moderation";
--> statement-breakpoint
CREATE SCHEMA "privacy";
--> statement-breakpoint
CREATE SCHEMA "ops";
--> statement-breakpoint
CREATE TYPE "identity"."account_status" AS ENUM('unverified', 'active', 'restricted', 'suspended', 'deletion_pending', 'deleted');--> statement-breakpoint
CREATE TYPE "identity"."consent_decision" AS ENUM('granted', 'denied', 'withdrawn');--> statement-breakpoint
CREATE TYPE "identity"."consent_purpose" AS ENUM('terms', 'privacy_notice', 'health_area', 'analytics', 'community_rules');--> statement-breakpoint
CREATE TYPE "identity"."staff_role" AS ENUM('moderator', 'moderation_lead', 'editor', 'medical_reviewer', 'admin', 'ops', 'privacy_officer');--> statement-breakpoint
CREATE TYPE "identity"."token_purpose" AS ENUM('verify_email', 'reset_password', 'change_email');--> statement-breakpoint
CREATE TYPE "health"."diary_kind" AS ENUM('symptom', 'fatigue');--> statement-breakpoint
CREATE TYPE "community"."bookmark_target" AS ENUM('post', 'article', 'offer');--> statement-breakpoint
CREATE TYPE "community"."content_status" AS ENUM('published', 'hidden', 'deleted', 'removed');--> statement-breakpoint
CREATE TYPE "community"."group_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "community"."group_type" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "community"."membership_status" AS ENUM('requested', 'active', 'rejected', 'left', 'removed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "messaging"."contact_status" AS ENUM('pending', 'active', 'ended', 'declined', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "messaging"."delivery_status" AS ENUM('pending', 'sent', 'skipped', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "messaging"."notification_type" AS ENUM('contact_request', 'contact_accepted', 'comment_reply', 'group_decision', 'new_message', 'moderation_decision', 'security', 'system');--> statement-breakpoint
CREATE TYPE "content"."article_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved', 'published', 'withdrawn', 'archived');--> statement-breakpoint
CREATE TYPE "content"."offer_status" AS ENUM('draft', 'in_review', 'published', 'hidden', 'expired');--> statement-breakpoint
CREATE TYPE "content"."review_decision" AS ENUM('approved', 'changes_requested');--> statement-breakpoint
CREATE TYPE "moderation"."action_kind" AS ENUM('note', 'warn', 'hide_content', 'request_edit', 'write_suspend', 'account_suspend', 'restore', 'no_action');--> statement-breakpoint
CREATE TYPE "moderation"."appeal_status" AS ENUM('open', 'in_review', 'upheld', 'overturned');--> statement-breakpoint
CREATE TYPE "moderation"."case_status" AS ENUM('new', 'triaged', 'in_progress', 'escalated', 'decided', 'appeal', 'closed');--> statement-breakpoint
CREATE TYPE "moderation"."priority" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "moderation"."report_reason" AS ENUM('harassment', 'privacy', 'dangerous_medical', 'spam_fraud', 'acute_danger', 'other');--> statement-breakpoint
CREATE TYPE "moderation"."report_target" AS ENUM('post', 'comment', 'profile', 'message', 'group');--> statement-breakpoint
CREATE TYPE "privacy"."export_status" AS ENUM('queued', 'running', 'ready', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "privacy"."request_status" AS ENUM('requested', 'deactivated', 'in_progress', 'verified', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "privacy"."request_type" AS ENUM('access', 'export', 'erasure_health', 'erasure_account', 'rectification');--> statement-breakpoint
CREATE TYPE "privacy"."task_status" AS ENUM('pending', 'done', 'failed', 'escalated');--> statement-breakpoint
CREATE TYPE "ops"."grant_status" AS ENUM('requested', 'approved', 'rejected', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "ops"."outbox_status" AS ENUM('pending', 'processing', 'done', 'failed', 'dead');--> statement-breakpoint
CREATE TABLE "identity"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"status" "identity"."account_status" DEFAULT 'unverified' NOT NULL,
	"audience_confirmed_at" timestamp with time zone NOT NULL,
	"terms_version" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"deletion_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."community_profiles" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"pseudonym" text NOT NULL,
	"pseudonym_normalized" text NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"canton" text,
	"discoverable" boolean DEFAULT true NOT NULL,
	"onboarding_goal" text,
	"onboarding_completed_at" timestamp with time zone,
	"rules_accepted_version" text,
	"rules_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" "identity"."consent_purpose" NOT NULL,
	"text_version" text NOT NULL,
	"decision" "identity"."consent_decision" NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."email_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" "identity"."token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"new_email" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."mfa_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" text DEFAULT 'totp' NOT NULL,
	"secret_encrypted" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"last_used_step" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"role" "identity"."staff_role" NOT NULL,
	"scope" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"granted_by" uuid,
	"approved_by" uuid,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_type" text DEFAULT 'unbekannt' NOT NULL,
	"browser" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"mfa_verified_at" timestamp with time zone,
	"reauth_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity"."user_preferences" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'de-CH' NOT NULL,
	"timezone" text DEFAULT 'Europe/Zurich' NOT NULL,
	"simple_view" boolean DEFAULT false NOT NULL,
	"text_scale" smallint DEFAULT 100 NOT NULL,
	"motion" text DEFAULT 'system' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"email_social" boolean DEFAULT false NOT NULL,
	"in_app_types" text[] DEFAULT '{contact_request,contact_accepted,comment_reply,group_decision,new_message,moderation_decision}'::text[] NOT NULL,
	"quiet_start" text DEFAULT '20:00' NOT NULL,
	"quiet_end" text DEFAULT '08:00' NOT NULL,
	"paused_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health"."check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"timezone" text NOT NULL,
	"utc_offset_minutes" integer NOT NULL,
	"energy" smallint,
	"mood" smallint,
	"fatigue" smallint,
	"note_encrypted" text,
	"scale_version" text NOT NULL,
	"client_op_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "check_ins_energy_range" CHECK ("health"."check_ins"."energy" is null or ("health"."check_ins"."energy" between 0 and 10)),
	CONSTRAINT "check_ins_mood_range" CHECK ("health"."check_ins"."mood" is null or ("health"."check_ins"."mood" between 1 and 5)),
	CONSTRAINT "check_ins_fatigue_range" CHECK ("health"."check_ins"."fatigue" is null or ("health"."check_ins"."fatigue" between 0 and 10)),
	CONSTRAINT "check_ins_has_value" CHECK ("health"."check_ins"."energy" is not null or "health"."check_ins"."mood" is not null or "health"."check_ins"."fatigue" is not null)
);
--> statement-breakpoint
CREATE TABLE "health"."diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "health"."diary_kind" NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"local_time" text NOT NULL,
	"timezone" text NOT NULL,
	"utc_offset_minutes" integer NOT NULL,
	"fatigue" smallint,
	"sleep_note_encrypted" text,
	"note_encrypted" text,
	"scale_version" text NOT NULL,
	"client_op_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "diary_entries_fatigue_range" CHECK ("health"."diary_entries"."fatigue" is null or ("health"."diary_entries"."fatigue" between 0 and 10))
);
--> statement-breakpoint
CREATE TABLE "health"."symptom_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"label" text NOT NULL,
	"owner_account_id" uuid,
	"catalog_version" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health"."symptom_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"definition_id" uuid,
	"label_snapshot" text NOT NULL,
	"intensity" smallint NOT NULL,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symptom_observations_intensity" CHECK ("health"."symptom_observations"."intensity" between 0 and 10),
	CONSTRAINT "symptom_observations_duration" CHECK ("health"."symptom_observations"."duration_minutes" is null or ("health"."symptom_observations"."duration_minutes" between 0 and 10080))
);
--> statement-breakpoint
CREATE TABLE "community"."bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"target_type" "community"."bookmark_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "community"."content_status" DEFAULT 'published' NOT NULL,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "community"."membership_status" NOT NULL,
	"rules_version_accepted" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"topic_id" uuid,
	"type" "community"."group_type" NOT NULL,
	"discoverable" boolean DEFAULT true NOT NULL,
	"rules" text NOT NULL,
	"rules_version" text NOT NULL,
	"status" "community"."group_status" DEFAULT 'active' NOT NULL,
	"moderator_account_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"group_id" uuid,
	"title" text,
	"body" text NOT NULL,
	"status" "community"."content_status" DEFAULT 'published' NOT NULL,
	"edited_at" timestamp with time zone,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community"."topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "messaging"."blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messaging"."contact_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_low" uuid NOT NULL,
	"account_high" uuid NOT NULL,
	"initiator_id" uuid NOT NULL,
	"status" "messaging"."contact_status" NOT NULL,
	"low_consent_at" timestamp with time zone,
	"high_consent_at" timestamp with time zone,
	"requested_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cooldown_until" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "contact_relationships_order" CHECK ("messaging"."contact_relationships"."account_low" < "messaging"."contact_relationships"."account_high")
);
--> statement-breakpoint
CREATE TABLE "messaging"."conversation_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"last_read_seq" bigint DEFAULT 0 NOT NULL,
	"hidden_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messaging"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"last_seq" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_relationship_id_unique" UNIQUE("relationship_id")
);
--> statement-breakpoint
CREATE TABLE "messaging"."delivery_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid,
	"account_id" uuid NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" "messaging"."delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dedupe_key" text NOT NULL,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"seq" bigint NOT NULL,
	"body_encrypted" text,
	"client_op_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "messaging"."notification_type" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"actor_id" uuid,
	"read_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."article_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid,
	"author_display" text NOT NULL,
	"status" "content"."article_status" DEFAULT 'draft' NOT NULL,
	"is_medical" boolean DEFAULT true NOT NULL,
	"reading_minutes" integer DEFAULT 3 NOT NULL,
	"cover_media_id" uuid,
	"review_due_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"withdraw_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"message_encrypted" text NOT NULL,
	"reply_email_encrypted" text,
	"ref_type" text,
	"ref_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."editorial_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"reviewer_display" text NOT NULL,
	"specialty" text NOT NULL,
	"decision" "content"."review_decision" NOT NULL,
	"comment" text,
	"next_review_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."help_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "help_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."knowledge_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "knowledge_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text DEFAULT '' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "content"."moment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_label" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"config" jsonb NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."legal_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"text_version" text NOT NULL,
	"valid_from" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "legal_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."safety_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"phone" text,
	"url" text,
	"availability" text NOT NULL,
	"region" text DEFAULT 'Schweiz' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"next_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."source_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"url" text,
	"published_on" text,
	"rights_note" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."support_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"organization" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"topic_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"cantons" text[] DEFAULT '{CH}'::text[] NOT NULL,
	"languages" text[] DEFAULT '{de}'::text[] NOT NULL,
	"audience" text NOT NULL,
	"responsibility" text NOT NULL,
	"access" text NOT NULL,
	"cost_note" text DEFAULT 'Kosten gemäss Anbieter' NOT NULL,
	"contact_way" text NOT NULL,
	"url" text NOT NULL,
	"status" "content"."offer_status" DEFAULT 'draft' NOT NULL,
	"change_flag" boolean DEFAULT false NOT NULL,
	"change_note" text,
	"reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "support_offers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."verification_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"verifier_id" uuid,
	"method" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "moderation"."appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"appellant_id" uuid,
	"reason_encrypted" text NOT NULL,
	"assigned_reviewer_id" uuid,
	"status" "moderation"."appeal_status" DEFAULT 'open' NOT NULL,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation"."evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"case_id" uuid,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"author_label" text NOT NULL,
	"snapshot_encrypted" text NOT NULL,
	"content_hash" text NOT NULL,
	"source_created_at" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation"."actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"actor_id" uuid,
	"kind" "moderation"."action_kind" NOT NULL,
	"rule_ref" text,
	"public_reason" text,
	"internal_note" text,
	"duration_hours" integer,
	"requires_second_approval" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation"."cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" text NOT NULL,
	"status" "moderation"."case_status" DEFAULT 'new' NOT NULL,
	"priority" "moderation"."priority" NOT NULL,
	"assignee_id" uuid,
	"due_at" timestamp with time zone NOT NULL,
	"target_type" "moderation"."report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"subject_account_id" uuid,
	"decision_summary" text,
	"rule_ref" text,
	"decided_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"evidence_purge_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation"."reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" text NOT NULL,
	"case_id" uuid,
	"reporter_id" uuid,
	"target_type" "moderation"."report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "moderation"."report_reason" NOT NULL,
	"details_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation"."sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"case_id" uuid,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"lifted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy"."deletion_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"object_class" text NOT NULL,
	"object_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy"."erasure_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"system" text NOT NULL,
	"object_class" text NOT NULL,
	"status" "privacy"."task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"receipt" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy"."export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "privacy"."export_status" DEFAULT 'queued' NOT NULL,
	"scope" text DEFAULT 'full' NOT NULL,
	"object_key" text,
	"size_bytes" integer,
	"client_op_id" uuid NOT NULL,
	"ready_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"downloaded_at" timestamp with time zone,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy"."requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"receipt_number" text NOT NULL,
	"type" "privacy"."request_type" NOT NULL,
	"status" "privacy"."request_status" DEFAULT 'requested' NOT NULL,
	"identity_method" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"exception_note" text,
	"exception_until" timestamp with time zone,
	"handled_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."access_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_id" uuid,
	"period" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"object_type" text,
	"object_id" text,
	"ticket" text,
	"result" text DEFAULT 'ok' NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"description" text NOT NULL,
	"reason" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "ops"."outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."rate_limit_counters" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_counters_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "ops"."security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"actor_id" uuid,
	"object_type" text,
	"route" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."special_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"approver_id" uuid,
	"ticket" text NOT NULL,
	"purpose" text NOT NULL,
	"scope" text NOT NULL,
	"status" "ops"."grant_status" DEFAULT 'requested' NOT NULL,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."community_profiles" ADD CONSTRAINT "community_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."consent_records" ADD CONSTRAINT "consent_records_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."email_tokens" ADD CONSTRAINT "email_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."mfa_factors" ADD CONSTRAINT "mfa_factors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."recovery_codes" ADD CONSTRAINT "recovery_codes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignments" ADD CONSTRAINT "role_assignments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."user_preferences" ADD CONSTRAINT "user_preferences_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."check_ins" ADD CONSTRAINT "check_ins_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."diary_entries" ADD CONSTRAINT "diary_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."symptom_definitions" ADD CONSTRAINT "symptom_definitions_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_entry_id_diary_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "health"."diary_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_definition_id_symptom_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "health"."symptom_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."bookmarks" ADD CONSTRAINT "bookmarks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "community"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "community"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."group_memberships" ADD CONSTRAINT "group_memberships_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "community"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_moderator_account_id_accounts_id_fk" FOREIGN KEY ("moderator_account_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "community"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "community"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."blocks" ADD CONSTRAINT "blocks_blocker_id_accounts_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."blocks" ADD CONSTRAINT "blocks_blocked_id_accounts_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."contact_relationships" ADD CONSTRAINT "contact_relationships_account_low_accounts_id_fk" FOREIGN KEY ("account_low") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."contact_relationships" ADD CONSTRAINT "contact_relationships_account_high_accounts_id_fk" FOREIGN KEY ("account_high") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."conversation_views" ADD CONSTRAINT "conversation_views_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "messaging"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."conversation_views" ADD CONSTRAINT "conversation_views_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."conversations" ADD CONSTRAINT "conversations_relationship_id_contact_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "messaging"."contact_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."delivery_jobs" ADD CONSTRAINT "delivery_jobs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "messaging"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."delivery_jobs" ADD CONSTRAINT "delivery_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "messaging"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."messages" ADD CONSTRAINT "messages_sender_id_accounts_id_fk" FOREIGN KEY ("sender_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging"."notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "content"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "content"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."articles" ADD CONSTRAINT "articles_topic_id_knowledge_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "content"."knowledge_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."editorial_reviews" ADD CONSTRAINT "editorial_reviews_version_id_article_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "content"."article_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."media_assets" ADD CONSTRAINT "media_assets_uploaded_by_accounts_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."moment_rules" ADD CONSTRAINT "moment_rules_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."source_references" ADD CONSTRAINT "source_references_version_id_article_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "content"."article_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."verification_records" ADD CONSTRAINT "verification_records_verifier_id_accounts_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_appellant_id_accounts_id_fk" FOREIGN KEY ("appellant_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_assigned_reviewer_id_accounts_id_fk" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."evidence_items" ADD CONSTRAINT "evidence_items_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "moderation"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."evidence_items" ADD CONSTRAINT "evidence_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_approved_by_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."cases" ADD CONSTRAINT "cases_assignee_id_accounts_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."cases" ADD CONSTRAINT "cases_subject_account_id_accounts_id_fk" FOREIGN KEY ("subject_account_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."reports" ADD CONSTRAINT "reports_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."reports" ADD CONSTRAINT "reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."sanctions" ADD CONSTRAINT "sanctions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation"."sanctions" ADD CONSTRAINT "sanctions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy"."erasure_tasks" ADD CONSTRAINT "erasure_tasks_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "privacy"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy"."export_jobs" ADD CONSTRAINT "export_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy"."requests" ADD CONSTRAINT "requests_handled_by_accounts_id_fk" FOREIGN KEY ("handled_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."access_reviews" ADD CONSTRAINT "access_reviews_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."feature_flags" ADD CONSTRAINT "feature_flags_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."special_access_grants" ADD CONSTRAINT "special_access_grants_requester_id_accounts_id_fk" FOREIGN KEY ("requester_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."special_access_grants" ADD CONSTRAINT "special_access_grants_approver_id_accounts_id_fk" FOREIGN KEY ("approver_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_uq" ON "identity"."accounts" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "accounts_status_idx" ON "identity"."accounts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "community_profiles_pseudonym_uq" ON "identity"."community_profiles" USING btree ("pseudonym_normalized");--> statement-breakpoint
CREATE INDEX "consent_records_account_idx" ON "identity"."consent_records" USING btree ("account_id","purpose","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_tokens_hash_uq" ON "identity"."email_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_tokens_account_idx" ON "identity"."email_tokens" USING btree ("account_id","purpose");--> statement-breakpoint
CREATE INDEX "role_assignments_account_idx" ON "identity"."role_assignments" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "identity"."sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "identity"."sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_account_date_uq" ON "health"."check_ins" USING btree ("account_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_op_uq" ON "health"."check_ins" USING btree ("account_id","client_op_id");--> statement-breakpoint
CREATE INDEX "diary_entries_account_time_idx" ON "health"."diary_entries" USING btree ("account_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_op_uq" ON "health"."diary_entries" USING btree ("account_id","client_op_id");--> statement-breakpoint
CREATE UNIQUE INDEX "symptom_definitions_code_uq" ON "health"."symptom_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "symptom_definitions_owner_idx" ON "health"."symptom_definitions" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "symptom_observations_entry_idx" ON "health"."symptom_observations" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_uq" ON "community"."bookmarks" USING btree ("account_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "community"."comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_uq" ON "community"."group_memberships" USING btree ("group_id","account_id");--> statement-breakpoint
CREATE INDEX "group_memberships_account_idx" ON "community"."group_memberships" USING btree ("account_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_slug_uq" ON "community"."groups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "community"."posts" USING btree ("group_id","published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "community"."posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_search_idx" ON "community"."posts" USING gin (to_tsvector('german', coalesce("title", '') || ' ' || "body"));--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_active_uq" ON "messaging"."blocks" USING btree ("blocker_id","blocked_id") WHERE "messaging"."blocks"."lifted_at" is null;--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "messaging"."blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_relationships_pair_uq" ON "messaging"."contact_relationships" USING btree ("account_low","account_high");--> statement-breakpoint
CREATE INDEX "contact_relationships_high_idx" ON "messaging"."contact_relationships" USING btree ("account_high");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_views_uq" ON "messaging"."conversation_views" USING btree ("conversation_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_jobs_dedupe_uq" ON "messaging"."delivery_jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "delivery_jobs_due_idx" ON "messaging"."delivery_jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_seq_uq" ON "messaging"."messages" USING btree ("conversation_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_op_uq" ON "messaging"."messages" USING btree ("sender_id","client_op_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_uq" ON "messaging"."notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_account_idx" ON "messaging"."notifications" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "article_versions_no_uq" ON "content"."article_versions" USING btree ("article_id","version_no");--> statement-breakpoint
CREATE INDEX "article_versions_search_idx" ON "content"."article_versions" USING gin (to_tsvector('german', "title" || ' ' || "summary" || ' ' || "body"));--> statement-breakpoint
CREATE INDEX "support_offers_search_idx" ON "content"."support_offers" USING gin (to_tsvector('german', "organization" || ' ' || "title" || ' ' || "summary" || ' ' || "description"));--> statement-breakpoint
CREATE UNIQUE INDEX "cases_number_uq" ON "moderation"."cases" USING btree ("case_number");--> statement-breakpoint
CREATE INDEX "cases_queue_idx" ON "moderation"."cases" USING btree ("status","priority","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_receipt_uq" ON "moderation"."reports" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "moderation"."reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "sanctions_account_idx" ON "moderation"."sanctions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "export_jobs_op_uq" ON "privacy"."export_jobs" USING btree ("account_id","client_op_id");--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_requests_receipt_uq" ON "privacy"."requests" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy"."requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_time_idx" ON "ops"."audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "ops"."audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_uq" ON "ops"."outbox_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "ops"."outbox_events" USING btree ("status","available_at");