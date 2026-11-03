-- Gesicherte Moderationsbelege sind unveränderlich (SAF02: «unveränderbarer Erfassungszeitpunkt»).
-- Löschen bleibt für die fristgebundene Beweislöschung (PRD 11, 180 Tage) möglich.
CREATE OR REPLACE FUNCTION moderation.evidence_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Belege sind unveränderlich';
END $$;
--> statement-breakpoint
CREATE TRIGGER evidence_items_no_update BEFORE UPDATE ON moderation.evidence_items
  FOR EACH ROW EXECUTE FUNCTION moderation.evidence_immutable();
