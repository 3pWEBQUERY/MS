CREATE TABLE "identity"."invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_hint" text NOT NULL,
	"purpose" text NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_redeemed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	CONSTRAINT "invitations_uses_range" CHECK ("identity"."invitations"."max_uses" between 1 and 500 and "identity"."invitations"."used_count" between 0 and "identity"."invitations"."max_uses")
);
--> statement-breakpoint
ALTER TABLE "identity"."invitations" ADD CONSTRAINT "invitations_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."invitations" ADD CONSTRAINT "invitations_revoked_by_accounts_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_code_hash_uq" ON "identity"."invitations" USING btree ("code_hash");