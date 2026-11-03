ALTER TABLE "identity"."community_profiles" ADD CONSTRAINT "community_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."consent_records" ADD CONSTRAINT "consent_records_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."email_tokens" ADD CONSTRAINT "email_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."mfa_factors" ADD CONSTRAINT "mfa_factors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."recovery_codes" ADD CONSTRAINT "recovery_codes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."role_assignments" ADD CONSTRAINT "role_assignments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "identity"."user_preferences" ADD CONSTRAINT "user_preferences_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."check_ins" ADD CONSTRAINT "check_ins_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."diary_entries" ADD CONSTRAINT "diary_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."symptom_definitions" ADD CONSTRAINT "symptom_definitions_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_entry_id_diary_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "health"."diary_entries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "health"."symptom_observations" ADD CONSTRAINT "symptom_observations_definition_id_symptom_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "health"."symptom_definitions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."bookmarks" ADD CONSTRAINT "bookmarks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "community"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."comments" ADD CONSTRAINT "comments_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "community"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."group_memberships" ADD CONSTRAINT "group_memberships_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "community"."topics"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_moderator_account_id_accounts_id_fk" FOREIGN KEY ("moderator_account_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."groups" ADD CONSTRAINT "groups_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "community"."topics"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community"."posts" ADD CONSTRAINT "posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "community"."groups"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."blocks" ADD CONSTRAINT "blocks_blocker_id_accounts_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."blocks" ADD CONSTRAINT "blocks_blocked_id_accounts_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."contact_relationships" ADD CONSTRAINT "contact_relationships_account_low_accounts_id_fk" FOREIGN KEY ("account_low") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."contact_relationships" ADD CONSTRAINT "contact_relationships_account_high_accounts_id_fk" FOREIGN KEY ("account_high") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."conversation_views" ADD CONSTRAINT "conversation_views_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "messaging"."conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."conversation_views" ADD CONSTRAINT "conversation_views_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."conversations" ADD CONSTRAINT "conversations_relationship_id_contact_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "messaging"."contact_relationships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."delivery_jobs" ADD CONSTRAINT "delivery_jobs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "messaging"."notifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."delivery_jobs" ADD CONSTRAINT "delivery_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "messaging"."conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."messages" ADD CONSTRAINT "messages_sender_id_accounts_id_fk" FOREIGN KEY ("sender_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messaging"."notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "content"."articles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."article_versions" ADD CONSTRAINT "article_versions_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "content"."media_assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."articles" ADD CONSTRAINT "articles_topic_id_knowledge_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "content"."knowledge_topics"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."editorial_reviews" ADD CONSTRAINT "editorial_reviews_version_id_article_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "content"."article_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."media_assets" ADD CONSTRAINT "media_assets_uploaded_by_accounts_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."moment_rules" ADD CONSTRAINT "moment_rules_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."source_references" ADD CONSTRAINT "source_references_version_id_article_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "content"."article_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content"."verification_records" ADD CONSTRAINT "verification_records_verifier_id_accounts_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_appellant_id_accounts_id_fk" FOREIGN KEY ("appellant_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."appeals" ADD CONSTRAINT "appeals_assigned_reviewer_id_accounts_id_fk" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."evidence_items" ADD CONSTRAINT "evidence_items_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "moderation"."reports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."evidence_items" ADD CONSTRAINT "evidence_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."actions" ADD CONSTRAINT "actions_approved_by_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."cases" ADD CONSTRAINT "cases_assignee_id_accounts_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."cases" ADD CONSTRAINT "cases_subject_account_id_accounts_id_fk" FOREIGN KEY ("subject_account_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."reports" ADD CONSTRAINT "reports_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."reports" ADD CONSTRAINT "reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "identity"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."sanctions" ADD CONSTRAINT "sanctions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "moderation"."sanctions" ADD CONSTRAINT "sanctions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "moderation"."cases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "privacy"."erasure_tasks" ADD CONSTRAINT "erasure_tasks_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "privacy"."requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "privacy"."export_jobs" ADD CONSTRAINT "export_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "privacy"."requests" ADD CONSTRAINT "requests_handled_by_accounts_id_fk" FOREIGN KEY ("handled_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ops"."access_reviews" ADD CONSTRAINT "access_reviews_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ops"."feature_flags" ADD CONSTRAINT "feature_flags_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ops"."special_access_grants" ADD CONSTRAINT "special_access_grants_requester_id_accounts_id_fk" FOREIGN KEY ("requester_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ops"."special_access_grants" ADD CONSTRAINT "special_access_grants_approver_id_accounts_id_fk" FOREIGN KEY ("approver_id") REFERENCES "identity"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_uq" ON "identity"."accounts" USING btree (lower("email"));
--> statement-breakpoint
CREATE INDEX "accounts_status_idx" ON "identity"."accounts" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_profiles_pseudonym_uq" ON "identity"."community_profiles" USING btree ("pseudonym_normalized");
--> statement-breakpoint
CREATE INDEX "consent_records_account_idx" ON "identity"."consent_records" USING btree ("account_id","purpose","decided_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_tokens_hash_uq" ON "identity"."email_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "email_tokens_account_idx" ON "identity"."email_tokens" USING btree ("account_id","purpose");
--> statement-breakpoint
CREATE INDEX "role_assignments_account_idx" ON "identity"."role_assignments" USING btree ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "identity"."sessions" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "identity"."sessions" USING btree ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_account_date_uq" ON "health"."check_ins" USING btree ("account_id","local_date");
--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_op_uq" ON "health"."check_ins" USING btree ("account_id","client_op_id");
--> statement-breakpoint
CREATE INDEX "diary_entries_account_time_idx" ON "health"."diary_entries" USING btree ("account_id","observed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_op_uq" ON "health"."diary_entries" USING btree ("account_id","client_op_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "symptom_definitions_code_uq" ON "health"."symptom_definitions" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "symptom_definitions_owner_idx" ON "health"."symptom_definitions" USING btree ("owner_account_id");
--> statement-breakpoint
CREATE INDEX "symptom_observations_entry_idx" ON "health"."symptom_observations" USING btree ("entry_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_uq" ON "community"."bookmarks" USING btree ("account_id","target_type","target_id");
--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "community"."comments" USING btree ("post_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_uq" ON "community"."group_memberships" USING btree ("group_id","account_id");
--> statement-breakpoint
CREATE INDEX "group_memberships_account_idx" ON "community"."group_memberships" USING btree ("account_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "groups_slug_uq" ON "community"."groups" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "community"."posts" USING btree ("group_id","published_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "community"."posts" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "posts_search_idx" ON "community"."posts" USING gin (to_tsvector('german', coalesce("title", '') || ' ' || "body"));
--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_active_uq" ON "messaging"."blocks" USING btree ("blocker_id","blocked_id") WHERE "messaging"."blocks"."lifted_at" is null;
--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "messaging"."blocks" USING btree ("blocked_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_relationships_pair_uq" ON "messaging"."contact_relationships" USING btree ("account_low","account_high");
--> statement-breakpoint
CREATE INDEX "contact_relationships_high_idx" ON "messaging"."contact_relationships" USING btree ("account_high");
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_views_uq" ON "messaging"."conversation_views" USING btree ("conversation_id","account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_jobs_dedupe_uq" ON "messaging"."delivery_jobs" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "delivery_jobs_due_idx" ON "messaging"."delivery_jobs" USING btree ("status","next_run_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "messages_seq_uq" ON "messaging"."messages" USING btree ("conversation_id","seq");
--> statement-breakpoint
CREATE UNIQUE INDEX "messages_op_uq" ON "messaging"."messages" USING btree ("sender_id","client_op_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_uq" ON "messaging"."notifications" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "notifications_account_idx" ON "messaging"."notifications" USING btree ("account_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "article_versions_no_uq" ON "content"."article_versions" USING btree ("article_id","version_no");
--> statement-breakpoint
CREATE INDEX "article_versions_search_idx" ON "content"."article_versions" USING gin (to_tsvector('german', "title" || ' ' || "summary" || ' ' || "body"));
--> statement-breakpoint
CREATE INDEX "support_offers_search_idx" ON "content"."support_offers" USING gin (to_tsvector('german', "organization" || ' ' || "title" || ' ' || "summary" || ' ' || "description"));
--> statement-breakpoint
CREATE UNIQUE INDEX "cases_number_uq" ON "moderation"."cases" USING btree ("case_number");
--> statement-breakpoint
CREATE INDEX "cases_queue_idx" ON "moderation"."cases" USING btree ("status","priority","due_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "reports_receipt_uq" ON "moderation"."reports" USING btree ("receipt_number");
--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "moderation"."reports" USING btree ("reporter_id");
--> statement-breakpoint
CREATE INDEX "sanctions_account_idx" ON "moderation"."sanctions" USING btree ("account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "export_jobs_op_uq" ON "privacy"."export_jobs" USING btree ("account_id","client_op_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_requests_receipt_uq" ON "privacy"."requests" USING btree ("receipt_number");
--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy"."requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_events_time_idx" ON "ops"."audit_events" USING btree ("occurred_at");
--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "ops"."audit_events" USING btree ("actor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_uq" ON "ops"."outbox_events" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "ops"."outbox_events" USING btree ("status","available_at");
