-- NFR16/NFR07: Protokoll der stündlichen Sicherungsläufe (nur Metadaten), 35 Tage Aufbewahrung.
CREATE TABLE IF NOT EXISTS "ops"."backup_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"object_key" text,
	"size_bytes" bigint,
	"error_code" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "backup_runs_finished_idx" ON "ops"."backup_runs" ("finished_at");
