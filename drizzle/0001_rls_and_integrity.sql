-- Row-Level Security als zusätzliche Schutzschicht für Inhaberdaten (PRD 14, Q10).
-- Wirksam für die nicht privilegierte Anwendungsrolle (siehe docs/db-roles.sql).
-- Die Anwendung setzt pro Transaktion: select set_config('app.account_id', '<uuid>', true)
-- RLS ersetzt keine fachliche Prüfung im Code.

CREATE OR REPLACE FUNCTION health.current_account() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.account_id', true), '')::uuid
$$;
--> statement-breakpoint
ALTER TABLE health.check_ins ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE health.diary_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE health.symptom_observations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE health.symptom_definitions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY check_ins_owner ON health.check_ins
  USING (account_id = health.current_account())
  WITH CHECK (account_id = health.current_account());
--> statement-breakpoint
CREATE POLICY diary_entries_owner ON health.diary_entries
  USING (account_id = health.current_account())
  WITH CHECK (account_id = health.current_account());
--> statement-breakpoint
CREATE POLICY symptom_observations_owner ON health.symptom_observations
  USING (account_id = health.current_account())
  WITH CHECK (account_id = health.current_account());
--> statement-breakpoint
CREATE POLICY symptom_definitions_read ON health.symptom_definitions FOR SELECT
  USING (owner_account_id IS NULL OR owner_account_id = health.current_account());
--> statement-breakpoint
CREATE POLICY symptom_definitions_write ON health.symptom_definitions FOR ALL
  USING (owner_account_id = health.current_account())
  WITH CHECK (owner_account_id = health.current_account());
--> statement-breakpoint

-- Audit ist nur anhängbar (PRI07): keine Änderung, keine Löschung.
CREATE OR REPLACE FUNCTION ops.audit_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.retention_job', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_events ist unveränderlich';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON ops.audit_events
  FOR EACH ROW EXECUTE FUNCTION ops.audit_append_only();
--> statement-breakpoint

-- Vieraugenprinzip: Prüfperson darf nicht Autor derselben Version sein (CON02).
CREATE OR REPLACE FUNCTION content.no_self_review() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE author uuid;
BEGIN
  SELECT author_id INTO author FROM content.article_versions WHERE id = NEW.version_id;
  IF author IS NOT NULL AND NEW.reviewer_id IS NOT NULL AND author = NEW.reviewer_id THEN
    RAISE EXCEPTION 'Eigenfreigabe ist ausgeschlossen';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER editorial_reviews_no_self BEFORE INSERT ON content.editorial_reviews
  FOR EACH ROW EXECUTE FUNCTION content.no_self_review();
--> statement-breakpoint

-- Beiträge brauchen ein gültiges Ziel; die Zielgruppe ist unveränderlich (COM03).
CREATE OR REPLACE FUNCTION community.posts_target_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Die Zielgruppe eines Beitrags kann nicht geändert werden';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER posts_target_immutable BEFORE UPDATE ON community.posts
  FOR EACH ROW EXECUTE FUNCTION community.posts_target_immutable();
--> statement-breakpoint

-- Nachrichtensequenz monoton je Gespräch (PRD 09)
CREATE OR REPLACE FUNCTION messaging.notify_message() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('ms_conversation', NEW.conversation_id::text || ':' || NEW.seq::text);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER messages_notify AFTER INSERT OR UPDATE ON messaging.messages
  FOR EACH ROW EXECUTE FUNCTION messaging.notify_message();
