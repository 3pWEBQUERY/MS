-- Getrennte Datenbankrollen (PRD 09, PRD 14, Q10)
-- Railway Postgres stellt standardmässig den Superuser «postgres» bereit. Superuser und
-- Tabelleneigentümer umgehen Row-Level Security. Für die volle Schutzwirkung der RLS-Policies
-- verbindet sich die Web-App mit einer nicht privilegierten Rolle. Automatisch umgesetzt durch
-- scripts/db-roles.ts im Pre-Deploy (DB_ROLES_MANAGE=1): Rollen anlegen/nachführen, Rechte dieser Datei
-- setzen; Passwörter aus dem Eigentümerpasswort abgeleitet (src/lib/db-role-url.ts). Web nutzt die
-- Rolle mit APP_DB_ROLE=ms_app, der Hilfe-Dienst mit HILFE_DB_ROLE=ms_hilfe_ro. Migrationen, Seed und
-- Hintergrundarbeiter (Löschaufträge) laufen weiter mit der Eigentümerrolle.
-- Die Zeilen «CREATE ROLE … PASSWORD» unten dienen nur der Dokumentation (manuelle Einrichtung).

CREATE ROLE ms_app LOGIN PASSWORD 'BITTE-ERSETZEN' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA identity, health, community, messaging, content, moderation, privacy, ops TO ms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity, health, community, messaging, content, moderation, privacy TO ms_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ops TO ms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO ms_app;
-- Audit nur anhängen (zusätzlich zum Trigger)
REVOKE UPDATE, DELETE ON ops.audit_events FROM ms_app;
-- Optionale Analytics (PRD 15): Web darf nur Bezug anlegen und Ereignisse anhängen; Auswertung
-- (Aggregate ab zehn Personen) liest der Betrieb über die Web-App, Löschung erledigt der Worker.
GRANT USAGE ON SCHEMA analytics TO ms_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA analytics TO ms_app;
GRANT DELETE ON analytics.subjects TO ms_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA identity, health, community, messaging, content, moderation, privacy
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_app;

-- Wirkung testen (muss 0 Zeilen liefern):
--   SET ROLE ms_app; SELECT count(*) FROM health.check_ins; RESET ROLE;

-- NFR20: Hilfe-Dienst (src/static-help) liest nur die Sicherheitskontakte.
CREATE ROLE ms_hilfe_ro LOGIN PASSWORD 'BITTE-ERSETZEN' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA content TO ms_hilfe_ro;
GRANT SELECT ON content.safety_contacts TO ms_hilfe_ro;
