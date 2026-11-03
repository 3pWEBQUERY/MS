-- NFR16: minütliche Anfrage- und Fehlerzähler je Web-Instanz (nur Zahlen, keine Pfade oder Inhalte).
-- Aufbewahrung 2 Tage (Arbeiter, ops-request-metrics-prune).
CREATE TABLE IF NOT EXISTS "ops"."request_metrics" (
	"minute" timestamp with time zone NOT NULL,
	"instance" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "request_metrics_pk" PRIMARY KEY ("minute", "instance")
);
