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
CREATE TYPE "identity"."account_status" AS ENUM('unverified', 'active', 'restricted', 'suspended', 'deletion_pending', 'deleted');
--> statement-breakpoint
CREATE TYPE "identity"."consent_decision" AS ENUM('granted', 'denied', 'withdrawn');
--> statement-breakpoint
CREATE TYPE "identity"."consent_purpose" AS ENUM('terms', 'privacy_notice', 'health_area', 'analytics', 'community_rules');
--> statement-breakpoint
CREATE TYPE "identity"."staff_role" AS ENUM('moderator', 'moderation_lead', 'editor', 'medical_reviewer', 'admin', 'ops', 'privacy_officer');
--> statement-breakpoint
CREATE TYPE "identity"."token_purpose" AS ENUM('verify_email', 'reset_password', 'change_email');
--> statement-breakpoint
CREATE TYPE "health"."diary_kind" AS ENUM('symptom', 'fatigue');
--> statement-breakpoint
CREATE TYPE "community"."bookmark_target" AS ENUM('post', 'article', 'offer');
--> statement-breakpoint
CREATE TYPE "community"."content_status" AS ENUM('published', 'hidden', 'deleted', 'removed');
--> statement-breakpoint
CREATE TYPE "community"."group_status" AS ENUM('active', 'archived');
--> statement-breakpoint
CREATE TYPE "community"."group_type" AS ENUM('open', 'closed');
--> statement-breakpoint
CREATE TYPE "community"."membership_status" AS ENUM('requested', 'active', 'rejected', 'left', 'removed', 'withdrawn');
--> statement-breakpoint
CREATE TYPE "messaging"."contact_status" AS ENUM('pending', 'active', 'ended', 'declined', 'withdrawn', 'expired');
--> statement-breakpoint
CREATE TYPE "messaging"."delivery_status" AS ENUM('pending', 'sent', 'skipped', 'failed', 'dead');
--> statement-breakpoint
CREATE TYPE "messaging"."notification_type" AS ENUM('contact_request', 'contact_accepted', 'comment_reply', 'group_decision', 'new_message', 'moderation_decision', 'security', 'system');
--> statement-breakpoint
CREATE TYPE "content"."article_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved', 'published', 'withdrawn', 'archived');
--> statement-breakpoint
CREATE TYPE "content"."offer_status" AS ENUM('draft', 'in_review', 'published', 'hidden', 'expired');
--> statement-breakpoint
CREATE TYPE "content"."review_decision" AS ENUM('approved', 'changes_requested');
--> statement-breakpoint
CREATE TYPE "moderation"."action_kind" AS ENUM('note', 'warn', 'hide_content', 'request_edit', 'write_suspend', 'account_suspend', 'restore', 'no_action');
--> statement-breakpoint
CREATE TYPE "moderation"."appeal_status" AS ENUM('open', 'in_review', 'upheld', 'overturned');
--> statement-breakpoint
CREATE TYPE "moderation"."case_status" AS ENUM('new', 'triaged', 'in_progress', 'escalated', 'decided', 'appeal', 'closed');
--> statement-breakpoint
CREATE TYPE "moderation"."priority" AS ENUM('P0', 'P1', 'P2', 'P3');
--> statement-breakpoint
CREATE TYPE "moderation"."report_reason" AS ENUM('harassment', 'privacy', 'dangerous_medical', 'spam_fraud', 'acute_danger', 'other');
--> statement-breakpoint
CREATE TYPE "moderation"."report_target" AS ENUM('post', 'comment', 'profile', 'message', 'group');
--> statement-breakpoint
CREATE TYPE "privacy"."export_status" AS ENUM('queued', 'running', 'ready', 'expired', 'failed');
--> statement-breakpoint
CREATE TYPE "privacy"."request_status" AS ENUM('requested', 'deactivated', 'in_progress', 'verified', 'completed', 'failed', 'rejected');
--> statement-breakpoint
CREATE TYPE "privacy"."request_type" AS ENUM('access', 'export', 'erasure_health', 'erasure_account', 'rectification');
--> statement-breakpoint
CREATE TYPE "privacy"."task_status" AS ENUM('pending', 'done', 'failed', 'escalated');
--> statement-breakpoint
CREATE TYPE "ops"."grant_status" AS ENUM('requested', 'approved', 'rejected', 'expired', 'revoked');
--> statement-breakpoint
CREATE TYPE "ops"."outbox_status" AS ENUM('pending', 'processing', 'done', 'failed', 'dead');
--> statement-breakpoint
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
