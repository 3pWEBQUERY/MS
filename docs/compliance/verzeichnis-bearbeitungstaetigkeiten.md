# Verzeichnis der Bearbeitungstätigkeiten (Entwurf)

> **ENTWURF – nicht freigegeben.** Gliederung nach Art. 12 Abs. 2 DSG \[Q1\]. Stand 3. November
> 2026, abgeleitet aus dem Code (Fundstellen je Angabe). Rechtliche Einordnungen und
> Rechtsgrundlagen sind **zu prüfen durch Datenschutzberatung (D01)**.

## Angaben zur verantwortlichen Stelle

| Angabe | Inhalt |
|---|---|
| Verantwortliche | [Trägerschaft eintragen], [Rechtsform], [Adresse], Schweiz |
| Datenschutzkontaktstelle | [Person/Funktion eintragen], [E-Mail eintragen] (Platzhalter `{{org.privacyEmail}}` in `scripts/seed/content/legal.ts`) |
| Vertretung in der EU / Datenschutzberatung | [nur falls nach DSGVO-Prüfung erforderlich, D01] |
| Produkt | MS Plattform (Arbeitsname, D09), Web-App mit Hintergrundarbeiter |
| Pflicht zur Führung | Ausnahme nach Art. 12 Abs. 5 DSG (weniger als 250 Mitarbeitende) setzt voraus, dass keine umfangreiche Bearbeitung besonders schützenswerter Daten erfolgt – hier vermutlich nicht anwendbar; zu prüfen D01 |

## Legende und gemeinsame Angaben

- **[bsP]** = besonders schützenswerte Personendaten (Art. 5 lit. c DSG, insbesondere Daten über
  die Gesundheit). Die PRD hält fest, dass **schon die Mitgliedschaft** Rückschlüsse auf eine
  MS-Erkrankung erlaubt (PRI01, `docs/prd/08-funktionale-anforderungen.md`); Kontodaten werden
  daher durchgehend als [bsP]-nah behandelt.
- **Gemeinsamer Hosting-Empfänger** aller Tätigkeiten: Railway (Hosting, Datenbank Postgres,
  Objektablage, Logs), Region Amsterdam `europe-west4` (`.railway/railway.ts`). Railway ist ein
  Unternehmen mit Sitz in den USA. Details und Grundlage der Auslandbekanntgabe:
  `auftragsbearbeiter.md`.
- **Auslandbekanntgabe** (alle Tätigkeiten): Speicherung in den Niederlanden; möglicher Fernzugriff
  des Anbieters aus den USA. Grundlage **zu klären D04**, Bewertung **zu prüfen D01**.
- **Rechtsgrundlage**: Für private Verantwortliche verlangt das DSG keine Rechtsgrundlage je
  Bearbeitung, wohl aber die Einhaltung der Grundsätze (Art. 6 DSG); bei Anwendbarkeit der DSGVO
  Art. 6 und Art. 9 \[Q5\]. Die Spalte «Grundlage» nennt nur den Produktmechanismus; die rechtliche
  Matrix erstellt D01.
- **Gemeinsame Sicherheitsmassnahmen** (gelten für alle Tätigkeiten, nicht wiederholt):
  - Transportverschlüsselung TLS durch Railway; HSTS in Produktion (`next.config.ts`).
  - Sicherheitsheader CSP, Referrer-Policy, Permissions-Policy (`next.config.ts`); private,
    nicht gemeinsam nutzbare Caches für geschützte Seiten (`src/proxy.ts`, `Cache-Control:
    private, no-store`); `"use cache"` nie für personenabhängige Daten (`docs/ENGINEERING.md`).
  - Rechteprüfung serverseitig bei jedem Zugriff (Data Access Layer `src/server/auth/viewer.ts`,
    `requireViewer`, `requireStaff`); Verwaltung nur mit Rolle **und** MFA in der Sitzung.
  - Datensparsame Logs: `src/lib/log-safety.ts` (`redactLogText`, verbotene Felder), automatisiert
    geprüft durch `src/lib/log-safety.test.ts` (NFR15).
  - Manipulationsgeschütztes Audit mit Hash-Kette, nur anhängbar (`src/server/audit.ts`,
    Trigger `ops.audit_append_only` in `drizzle/0001_rls_and_integrity.sql`).
  - Anwendungsseitige Verschlüsselung AES-256-GCM für Freitexte (`src/server/crypto.ts`), Schlüssel
    `DATA_ENCRYPTION_KEY` als Umgebungsvariable (kein KMS – Lücke, siehe DSFA).
  - Keine Werbe-Tracker, keine externen Schriften (lokal über `next/font/local` in
    `src/app/layout.tsx`), kein externes Fehlermonitoring im Code.

## Übersicht

| Nr. | Tätigkeit | [bsP] | Hauptschemas |
|---|---|---|---|
| T01 | Konto, Anmeldung, Mitarbeitendenzugang | ja (Zielgruppenbestätigung, Mitgliedschaft) | `identity` |
| T02 | Gesundheitstagebuch («Mein MS») | ja | `health` |
| T03 | Community (Profil, Beiträge, Gruppen) | ja (Inhalte, Mitgliedschaft) | `identity.community_profiles`, `community` |
| T04 | Nachrichten und Mitteilungen | ja (Inhalte) | `messaging` |
| T05 | Moderation, Meldungen, Einsprüche | ja (Inhalte, Belege) | `moderation` |
| T06 | Wissen und Redaktion | nein (Mitarbeitendendaten) | `content` |
| T07 | Kontaktformular | möglich (Freitext) | `content.contact_messages` |
| T08 | Hilfe-Verzeichnis und Sicherheitsseite | nein | `content.support_offers`, `content.safety_contacts` |
| T09 | Datenschutzaufträge, Export, Löschung | ja (Export enthält alles) | `privacy` |
| T10 | Optionale Nutzungsstatistik | ja-nah (pseudonym, Mitglieder) | `analytics` |
| T11 | Betrieb, Protokolle, Audit | ja-nah (Konto-IDs) | `ops` |
| T12 | Sicherungen | ja (Gesamtbestand) | Bucket `ms-backups` |

---

## T01 Konto, Anmeldung, Mitarbeitendenzugang

| Merkmal | Inhalt |
|---|---|
| Zweck | Sicherer Zugang, Bestätigung der Zielgruppe, Kontoverwaltung, Sicherheitsmitteilungen, Rollen der Mitarbeitenden (ACC01–ACC08, PRD 03) |
| Grundlage (Produkt) | Registrierung mit Zustimmung zu Bedingungen und Kenntnisnahme der Datenschutzinformation (`identity.consent_records`, Zwecke `terms`, `privacy_notice`); Rechtsgrundlage zu prüfen D01 |
| Betroffene | Registrierende, Mitglieder, Mitarbeitende (Moderation, Redaktion, medizinische Prüfung, Administration, Betrieb, Datenschutzstelle) |
| Datenkategorien | E-Mail-Adresse; Passwort nur als Argon2id-Hash; Kontostatus; **Bestätigung «mindestens 18 Jahre und lebe mit MS»** (`audience_confirmed_at`) **[bsP]**; Fassung der Bedingungen; Zeitpunkte (Erstellung, letzte Aktivität, Vorwarnung Inaktivität, Deaktivierung) – `identity.accounts`. Sitzungen: Token-Hash, Gerätetyp und Browserfamilie (aus User-Agent abgeleitet, `src/server/auth/session.ts`), Zeitpunkte – `identity.sessions`. E-Mail-Token (Hash, ggf. neue Adresse) – `identity.email_tokens`. TOTP-Geheimnis verschlüsselt – `identity.mfa_factors`; Wiederherstellungscodes als Hash – `identity.recovery_codes`. Einwilligungsnachweise (Zweck, Textfassung, Entscheidung, Kanal, Zeit) – `identity.consent_records`. Anzeige- und Mitteilungseinstellungen, Zeitzone, Ruhezeiten – `identity.user_preferences`. Rollen, Befristung, vergebende/freigebende Person – `identity.role_assignments`. Drosselungszähler mit Schlüssel `sha256(E-Mail)` bzw. **IP-Adresse im Klartext** (`login-fail-ip:`, `invite-try:`, `reset-ip:` in `src/server/modules/account/auth-actions.ts`) – `ops.rate_limit_counters` |
| Empfänger | Intern: Datenschutzstelle (Auskunft, MFA-Wiederherstellung), Administration (Rollen, Kontostatus, ohne Inhaltsleserecht). Extern: Railway (Hosting); E-Mail-Anbieter (Bestätigung, Passwort-Reset, Sicherheitsmitteilungen, Inaktivitätsvorwarnung, Löschbeleg; Vorlagen in `src/server/mailer.ts`) – **Anbieter noch nicht gewählt**; optional Pwned Passwords (nur 5 Zeichen des SHA-1-Hashs, standardmässig aus, `src/server/auth/password-leak.ts`) |
| Auslandbekanntgabe | Railway (NL, US-Unternehmen); E-Mail-Anbieter offen; Pwned Passwords nur bei Einschalten – zu klären D04 |
| Aufbewahrung | Unbestätigte Konten 7 Tage; Konto bis Löschung bzw. 24 Monate Inaktivität + 30 Tage Vorwarnfrist (Mitarbeitende ausgenommen); Sitzungen und Token 1 Tag nach Ablauf; Drosselungszähler 2 Tage; Einwilligungsnachweise 3 Jahre nach Kontolöschung; technischer Restdatensatz des Kontos ohne E-Mail/Passwort unbefristet. Fundstellen: `aufbewahrungsplan.md` A01–A08 (`src/server/modules/privacy/retention-rules.ts`, `retention.ts`, `src/worker/handlers/maintenance.ts`) |
| Sicherheitsmassnahmen | Argon2id 19 MiB, t=2 (`src/server/auth/password.ts`); Passwortregeln ≥ 15 Zeichen (`src/server/auth/password-policy.ts`); Sitzungscookie `__Host-ms_session`, `httpOnly`, `secure` in Produktion, `sameSite=lax`, absolut 12 h, Leerlauf 60 min (`src/server/auth/session.ts`); Token nur als Hash, Reset 30 min, Bestätigung 24 h (`src/server/modules/account/tokens.ts`); Drosselung Anmeldung 10 je Adresse bzw. 50 je Verbindung in 15 min (`auth-actions.ts`, `src/server/rate-limit.ts`); MFA-Pflicht für Verwaltung (`requireStaff` in `src/server/auth/viewer.ts`); erneute Anmeldung für sensible Aktionen (`requireRecentAuth`); Rollen optional befristet (Enddatum höchstens 2 Jahre, sonst bis Entzug) und auditiert (`src/server/modules/admin/role-actions.ts`); neutrale Antworten ohne Kontoaufzählung (Mitteilung `registration_attempt`, `src/server/mailer.ts`) |
| Lücken | IP-Adressen in Drosselungsschlüsseln ungehasht (anders als `contact:` in `src/server/modules/content/actions.ts`, dort `sha256`); Datenschutzinformation nennt IP-Adressen nicht ausdrücklich |

## T02 Gesundheitstagebuch («Mein MS»)

| Merkmal | Inhalt |
|---|---|
| Zweck | Freiwillige private Alltagsdokumentation ausschliesslich für die betroffene Person (DIA01–DIA08); keine Interpretation, keine Freigabe an Dritte im MVP (PRD 03) |
| Grundlage (Produkt) | Gesonderte, nicht vorausgewählte Aktivierung (Einwilligung `health_area` in `identity.consent_records`), jederzeit widerrufbar (PRI02); Rechtsgrundlage zu prüfen D01; Zweckbestimmung Medizinprodukterecht D02 |
| Betroffene | Mitglieder mit aktiviertem Gesundheitsbereich |
| Datenkategorien | **Alle [bsP]**: Check-ins mit Energie (0–10), Stimmung (1–5), Fatigue (0–10), Notiz (verschlüsselt), lokales Datum, Zeitzone – `health.check_ins`. Tagebucheinträge Symptom/Fatigue mit Beobachtungszeit, Fatigue-Wert, Schlaf- und Freitextnotiz (verschlüsselt) – `health.diary_entries`. Symptomangaben mit Bezeichnung zum Erfassungszeitpunkt, Intensität, Dauer – `health.symptom_observations`. Eigene Symptombezeichnungen – `health.symptom_definitions` (`owner_account_id`). Exportdateien (T09) |
| Empfänger | Nur die betroffene Person (Anzeige, Export). Keine Mitarbeitendenrolle hat Lesezugriff (PRD 03). Extern: Railway als Hosting |
| Auslandbekanntgabe | Wie Hosting (NL, US-Unternehmen) – zu klären D04 |
| Aufbewahrung | Bis eigene Löschung (sofort, `eraseHealthData` in `src/server/modules/privacy/erasure.ts`); nach Widerruf Löschung binnen 30 Tagen, ausgeführt ab Tag 28 (`retention-rules.ts`, `retention.ts` `eraseHealthAfterWithdrawal`); bei Kontolöschung Teilschritt `database:health`; Sicherungskopien bis 35 Tage (T12). `aufbewahrungsplan.md` A09–A11 |
| Sicherheitsmassnahmen | Eigenes Schema `health`; Row-Level Security je Inhaber (`drizzle/0001_rls_and_integrity.sql`, Policies `check_ins_owner`, `diary_entries_owner`, `symptom_observations_owner`, `symptom_definitions_*`); Zugriff nur über `withOwnerScope` **und** Filter auf `accountId` (`docs/ENGINEERING.md`); Notizen AES-256-GCM (`src/server/crypto.ts`); Schreibschutz bei Widerruf (`src/server/modules/health/write-guard.ts`); Drosselung Schreibvorgänge; Fremdzugriffe werden als `security_events` erfasst (`recordDenied`, `src/server/audit.ts`); Gesundheitswerte nie in Logs (verbotene Felder `energy`, `mood`, `fatigue`, `symptoms`, `note` in `src/lib/log-safety.ts`) |
| Lücken | (1) RLS wirkt nur mit Rolle `ms_app`; `.railway/railway.ts` verbindet `web` mit der Eigentümerrolle. (2) Skalenwerte sowie **eigene Symptombezeichnungen und `label_snapshot` sind Freitext/Werte im Klartext** (`src/server/db/schema/health.ts`, `src/server/modules/health/diary-input.ts`) – nur durch RLS und Rechteprüfung geschützt, nicht verschlüsselt. Die Datenschutzinformation sagt «Freitexte wie Tagebuchnotizen … verschlüsselt» – für Bezeichnungen trifft das nicht zu |

## T03 Community (Profil, Beiträge, Gruppen)

| Merkmal | Inhalt |
|---|---|
| Zweck | Moderierter Austausch unter Erwachsenen mit MS unter Pseudonym (COM01–COM08) |
| Grundlage (Produkt) | Nutzungsbedingungen und Bestätigung der Community-Regeln (`community_profiles.rules_accepted_version`); zu prüfen D01 |
| Betroffene | Mitglieder; in Inhalten erwähnte Dritte |
| Datenkategorien | Pseudonym, Interessen aus kontrollierter Liste, optional Kanton, Auffindbarkeit, Onboarding-Ziel, Regelbestätigung – `identity.community_profiles`. Beiträge (Titel, Text, Thema, Gruppe), Antworten, Merkliste, Gruppenmitgliedschaften und -anfragen – `community.*`. **Inhalte sind oft [bsP]** (Erfahrungen mit Krankheit, Therapien); Mitgliedschaft in Gruppen kann [bsP] offenlegen |
| Empfänger | Andere Mitglieder (Pseudonym, Inhalte; geschlossene Gruppen nur nach Aufnahme); Moderation (Community-Inhalte, Meldungen); Railway |
| Auslandbekanntgabe | Wie Hosting – zu klären D04 |
| Aufbewahrung | Bis eigene Inhalts- oder Kontolöschung; bei Kontolöschung sofort ausgeblendet, danach entfernt bzw. als textloser Platzhalter erhalten, wenn andere geantwortet haben (`ACCOUNT_STEPS` `database:community_texts` in `src/server/modules/privacy/erasure.ts`); keine Altersfrist im Code (PRD: «bis Löschung») |
| Sicherheitsmassnahmen | E-Mail nie in Community-Abfragen (`docs/ENGINEERING.md`, Kommentar `src/server/db/schema/identity.ts`); Pseudonym eindeutig normalisiert; Blockierungen beidseitig (`messaging.blocks`); Drosselung Beiträge/Antworten (`src/server/modules/community/actions.ts`); Ausgabe nur als Text (`cleanText`, `PlainText`); Ziel eines Beitrags unveränderlich (Trigger `posts_target_immutable`) |
| Lücken | Beiträge und Antworten werden im Klartext gespeichert (bewusst, da für Mitglieder sichtbar) – in der DSFA bewertet |

## T04 Nachrichten und Mitteilungen

| Merkmal | Inhalt |
|---|---|
| Zweck | Private Gespräche nach gegenseitiger Kontaktfreigabe, Hinweise in der App und per E-Mail (MSG01–MSG08) |
| Betroffene | Mitglieder (Absender, Empfänger) |
| Datenkategorien | Kontaktbeziehungen mit Status und Sperrfrist – `messaging.contact_relationships`; Gespräche, eigene Ansichtsdaten (ohne Lesebestätigung) – `messaging.conversations`, `conversation_views`; Nachrichtentext **verschlüsselt** – `messaging.messages.body_encrypted` (**Inhalte oft [bsP]**); Blockierungen; In-App-Mitteilungen ohne Text (nur Typ, Ziel, Auslöser) – `messaging.notifications`; Zustellaufträge – `messaging.delivery_jobs` |
| Empfänger | Gesprächspartner; Moderation nur für gemeldete Auswahl als Beleg (T05); E-Mail-Anbieter für Sammelhinweise (`social_digest`, standardmässig aus: `email_social` default `false`); Railway |
| Auslandbekanntgabe | Wie Hosting; E-Mail-Anbieter offen – zu klären D04 |
| Aufbewahrung | Bis Löschung durch Absender oder Kontolöschung (Text beidseitig entfernt, `erasure.ts`); Nachrichten der Gegenseite bleiben deren Daten; Kontaktanfragen verfallen nach 14 Tagen, neue Anfrage nach 30 Tagen (`maintenance.ts`); Mitteilungen und Zustellaufträge: **keine Frist im Code** (nur bei Kontolöschung entfernt) |
| Sicherheitsmassnahmen | AES-256-GCM (`src/server/crypto.ts`); Kontakt nur nach Zustimmung; Blockierung; Prüfung von Rechten, Blockierung und Kontaktstatus vor jeder Zustellung erneut (Handler in `src/worker/handlers/notifications.ts`, RUNBOOKS R2); E-Mail-Vorlagen ohne Inhalte (`src/server/mailer.ts`); Ruhezeiten; Drosselung |

## T05 Moderation, Meldungen, Einsprüche

| Merkmal | Inhalt |
|---|---|
| Zweck | Schutz der Community, Bearbeitung von Meldungen, Massnahmen, unabhängige Einspruchsprüfung, Krisenverweis (SAF02–SAF05, Kapitel 10) |
| Betroffene | Meldende, gemeldete Mitglieder, Moderierende, Prüfende |
| Datenkategorien | Meldungen (meldende Person, Ziel, Grund, Details **verschlüsselt**, Belegnummer) – `moderation.reports`; Fälle (betroffenes Konto, Priorität, Zuweisung, Entscheidzusammenfassung, Regelbezug, Fristen) – `moderation.cases`; Belege (Pseudonym des Verfassers, Inhaltskopie **verschlüsselt**, Hash) – `moderation.evidence_items`; Massnahmen (öffentliche Begründung, **interne Notiz im Klartext**) – `moderation.actions`; Sanktionen – `moderation.sanctions`; Einsprüche (Begründung **verschlüsselt**, Entscheidnotiz) – `moderation.appeals`. **Belege und Begründungen können [bsP] enthalten** |
| Empfänger | Moderation (zugewiesene Fälle), Moderationsleitung, betroffene Person (Entscheid), meldende Person (Belegnummer, Status); Railway |
| Auslandbekanntgabe | Wie Hosting – zu klären D04 |
| Aufbewahrung | Entschiedene Fälle schliessen nach Einspruchsfrist 30 Tage + 1 Tag automatisch; **Belege und Meldungsdetails 180 Tage nach Abschluss gelöscht** (`EVIDENCE_RETENTION_MS` in `src/server/modules/moderation/cases.ts`, Aufgabe `moderation-evidence-purge` in `src/worker/handlers/moderation.ts`). Fälle, Meldungs-Metadaten, Massnahmen inkl. interner Notiz, Sanktionen, Einsprüche inkl. verschlüsselter Begründung: **keine Löschregel im Code**. Bei Kontolöschung werden meldende Person und einsprechende Person entkoppelt (`erasure.ts`) |
| Sicherheitsmassnahmen | Belege unveränderlich (Trigger `moderation.evidence_immutable`, `drizzle/0003_evidence_immutable.sql`); Verschlüsselung Details/Belege/Einsprüche; zweite Freigabe für schwere Massnahmen; Eigenprüfung von Einsprüchen ausgeschlossen; Mitteilungen nur mit Fall-ID; Audit ohne Freitext; Meldende gegenüber Gemeldeten anonym |
| Lücken | Frist für Falldaten ausserhalb der Belege fehlt (PRD 11 «Meldungen und Belege 180 Tage nach Fallabschluss» wird nur für Belege und Meldungsdetails umgesetzt) |

## T06 Wissen und Redaktion

| Merkmal | Inhalt |
|---|---|
| Zweck | Redaktionell und medizinisch geprüfte Wissensartikel mit Vieraugenprüfung (CON01–CON04) |
| Betroffene | Mitarbeitende der Redaktion und medizinische Prüfende; Personen auf hochgeladenen Bildern (falls vorhanden) |
| Datenkategorien | Angezeigte Autorenschaft, Prüfvermerke mit angezeigtem Namen und Fachgebiet, Kommentare – `content.article_versions`, `content.editorial_reviews`; Quellenangaben; Medien mit Dateiname, Alternativtext (Upload nur Redaktion/Administration mit MFA, `src/app/api/v1/media/route.ts`) – `content.media_assets`, Bucket `ms-medien` (Präfix `media/`) |
| Empfänger | Öffentlichkeit (publizierte Artikel, Autorenschaft); Redaktion intern; Railway |
| Auslandbekanntgabe | Wie Hosting – zu klären D04 |
| Aufbewahrung | Artikelversionen und Prüfvermerke: keine Frist (Nachweis der Prüfung; zu bestimmen D05/D08); Medien bis Entfernung (`media-actions.ts`) |
| Sicherheitsmassnahmen | Eigenfreigabe ausgeschlossen (Trigger `content.no_self_review`); Medienauslieferung nur registrierter Objekte unter `media/` mit CSP-Sandbox (`src/app/medien/[...key]/route.ts`); automatischer Rückzug überfälliger Artikel (RUNBOOKS R8) |

## T07 Kontaktformular

| Merkmal | Inhalt |
|---|---|
| Zweck | Anliegen, Inhaltsfehler, Datenschutzanliegen, Barrieremeldungen entgegennehmen (CON06) |
| Betroffene | Gäste und Mitglieder, die schreiben; im Anliegen erwähnte Dritte |
| Datenkategorien | Kategorie, Anliegen bis 2000 Zeichen **verschlüsselt**, optionale Antwortadresse **verschlüsselt**, Bezug auf Artikel/Angebot – `content.contact_messages`. Trotz Hinweis können Anliegen **[bsP]** enthalten. Drosselung über `sha256(IP)` (`src/server/modules/content/actions.ts`) |
| Empfänger | Redaktion (ohne Kategorie «datenschutz»); Datenschutzstelle **und Administration** für Datenschutzanliegen (`listContactMessages` in `src/server/modules/content/editorial-queries.ts`); Railway |
| Auslandbekanntgabe | Wie Hosting; Antwort per E-Mail über E-Mail-Anbieter bzw. Postfach der Trägerschaft [eintragen] – zu klären D04 |
| Aufbewahrung | **Keine Löschregel im Code**; keine Verknüpfung zum Konto, daher auch nicht von der Kontolöschung erfasst |
| Sicherheitsmassnahmen | Verschlüsselung, Honeypot, Mindest-Ausfüllzeit, Formular-Token, Drosselung je gehashter Verbindung |
| Lücken | Frist fehlt (Vorschlag für D05 nötig); Leserecht der Administration auf Datenschutzanliegen mit PRD 03 («Administration: kein pauschales Inhaltsleserecht») abgleichen |

## T08 Hilfe-Verzeichnis und Sicherheitsseite

| Merkmal | Inhalt |
|---|---|
| Zweck | Verzeichnis Schweizer Hilfsangebote und geprüfte Krisenkontakte, auch bei Störung erreichbar (CON05, SAF06, NFR20) |
| Betroffene | Anbietende Organisationen (in der Regel juristische Personen; ggf. genannte Kontaktpersonen); Mitarbeitende, die verifizieren |
| Datenkategorien | Organisation, Kontaktweg, Link, Region, Erreichbarkeit – `content.support_offers`, `content.safety_contacts`; Verifikationen mit Methode, Notiz, prüfender Person (`verified_by` als Text) – `content.verification_records` |
| Empfänger | Öffentlichkeit; eigenständiger Dienst `hilfe` (`src/static-help/server.ts`) liest nur `content.safety_contacts`; Linkprüfung ruft externe Adressen ohne Personendaten ab (`src/worker/handlers/content.ts`) |
| Auslandbekanntgabe | Wie Hosting |
| Aufbewahrung | Bis Ausblenden/Entfernen; Verifikationsnachweise ohne Frist (D05/D08) |
| Sicherheitsmassnahmen | Aktivierung nur nach fachlicher Verifikation; statische Rückfallliste `src/lib/safety-static.ts`; Lese-Rolle `ms_hilfe_ro` vorgesehen (`docs/db-roles.sql`) |
| Lücken | `.railway/railway.ts` übergibt dem Dienst `hilfe` die volle `DATABASE_URL` statt der Lese-Rolle |

## T09 Datenschutzaufträge, Export, Löschung

| Merkmal | Inhalt |
|---|---|
| Zweck | Betroffenenrechte: Auskunft, Export, Berichtigung, Löschung, MFA-Wiederherstellung (PRI03–PRI06, S15, S58) |
| Betroffene | Mitglieder; bearbeitende Datenschutzstelle |
| Datenkategorien | Aufträge (Konto-ID, Belegnummer, Typ, Status, Methode der Identitätsprüfung, Frist, begründete Ausnahme als Freitext, bearbeitende Person) – `privacy.requests`; Teilschritte mit Beleg (nur Anzahlen) – `privacy.erasure_tasks`; Exportaufträge – `privacy.export_jobs`; **Exportdateien JSON und Tagebuch-CSV mit allen eigenen Daten [bsP]** im Bucket `ms-medien` unter `exports/<konto>/<auftrag>` (`src/server/modules/privacy/export-jobs.ts`); Löschjournal (Konto-ID, Objektklasse, Objekt-ID) – `privacy.deletion_journal` |
| Empfänger | Betroffene Person (authentifizierter Download); Datenschutzstelle (Auftragsübersicht, Auskunftszusammenfassung `access-summary.ts`); E-Mail-Anbieter (Abschlussbeleg mit Belegnummer); Railway |
| Auslandbekanntgabe | Wie Hosting; E-Mail-Anbieter offen |
| Aufbewahrung | Exportdateien höchstens 24 h ab Bereitstellung (`EXPORT_TTL_MS`, `expireExports` alle 10 min); Arbeitsfrist für Aufträge 30 Tage (`REQUEST_DUE_DAYS` in `requests.ts`); Ausnahmen höchstens 1 Jahr, danach erneute Prüfung (`admin-actions.ts`). **Aufträge, Teilschritte und Löschjournal: keine Löschregel im Code** |
| Sicherheitsmassnahmen | Erneute Anmeldung vor Export/Löschung; Identitätsprüfung ohne Ausweiskopie (`IDENTITY_METHODS`); Exportdateien AES-256-GCM vor Upload (`encryptBuffer`, `src/server/storage.ts`: Railway Buckets ohne serverseitige Verschlüsselung); Löschzustandsautomat mit Wiederholung und Eskalation nach 5 Versuchen (`tasks.ts`, `erasure.ts`), Prüfung «keine Restdaten» vor Abschluss (`verifyAccountErased`); Alarm `privacy_request_failed` |
| Lücken | Teilschritt «Auftragsbearbeiter (E-Mail-Versand)» wird automatisch mit dem Text «… gemäss Auftragsbearbeitungsvertrag» abgeschlossen (`NOT_APPLICABLE.vendors` in `tasks.ts`), obwohl weder Anbieter noch Vertrag bestehen. Exportdateien liegen im selben Bucket wie öffentliche Medien (getrennt nur über Präfix und Auslieferungslogik) |

## T10 Optionale Nutzungsstatistik

| Merkmal | Inhalt |
|---|---|
| Zweck | Verständlichkeit und Nutzen der Plattform messen (PRD 15), fünf Ereignisse |
| Grundlage (Produkt) | Eigene, nicht vorausgewählte Einwilligung `analytics` (Onboarding S07 oder S12), sofort widerrufbar; ohne Einwilligung wird nichts gespeichert (`hasAnalyticsConsent` in `src/server/modules/analytics/track.ts`) |
| Betroffene | Mitglieder mit Einwilligung |
| Datenkategorien | Zufälliger Analysebezug je Konto (`ref` ↔ `account_id`, ≤ 30 Tage) – `analytics.subjects`; Ereignisname, erlaubte Parameter, Kalendertag ohne Uhrzeit – `analytics.events`; Kohortenzähler ohne Bezug – `analytics.cohort_days`. Ereignisse ohne Inhalte, IDs, Suchtexte, Symptomwerte (`src/lib/analytics.ts`). Da nur Mitglieder erfasst werden, ist der Datensatz **[bsP]-nah** |
| Empfänger | Betrieb/Produkt nur als Aggregate ab 10 Personen (`ANALYTICS_MIN_PERSONS` in `src/lib/analytics.ts`, Unterdrückung kleiner Zellen in `src/server/modules/analytics/aggregates.ts`); kein externer Analysedienst |
| Auslandbekanntgabe | Wie Hosting |
| Aufbewahrung | Bezug und Rohdaten höchstens 30 Tage; sofortige Löschung bei Widerruf, neuer Einwilligungsfassung oder Kontolöschung; Kohortenzähler vorläufig 730 Tage (`src/worker/handlers/analytics.ts`) |
| Sicherheitsmassnahmen | Eigenes Schema; Rolle `ms_app` darf nur lesen/anhängen bzw. Bezug löschen (`docs/db-roles.sql`); Deduplizierung je Bezug/Tag; Mindestgruppengrösse |
| Lücken | Datenschutzinformation und Onboarding sprechen von «anonymer» Statistik; die Rohdaten sind während bis zu 30 Tagen über `analytics.subjects.account_id` **pseudonym und rückführbar**, nicht anonym. Formulierung prüfen (D01) |

## T11 Betrieb, Protokolle, Audit

| Merkmal | Inhalt |
|---|---|
| Zweck | Sicherheit, Nachvollziehbarkeit privilegierter Zugriffe, Störungserkennung, Hintergrundaufgaben (PRI07, NFR15, NFR16, NFR19) |
| Betroffene | Mitglieder und Mitarbeitende (über Konto-IDs), Besucherinnen und Besucher (Plattformlogs) |
| Datenkategorien | Audit (handelnde Konto-ID, Rolle, Aktion, Objekt, Ticket, Ergebnis, Hash) – `ops.audit_events`; verweigerte Zugriffe (Art, Konto-ID, Objekttyp, Route) – `ops.security_events`; Outbox mit IDs und **verschlüsselten Empfängeradressen** in der Nutzlast (`toEncrypted`, `retention.ts`, `erasure.ts`) – `ops.outbox_events`; Sonderzugriffe (Antrag, Freigabe, Ticket, Zweck, Umfang) – `ops.special_access_grants`; Rechteprüfungen – `ops.access_reviews`; Schalter mit ändernder Person – `ops.feature_flags`; Zähler ohne Pfade – `ops.request_metrics`; Lebenszeichen – `ops.worker_heartbeats`. Plattformlogs bei Railway (Logzeilen der Anwendung mit Codes/Korrelations-IDs; HTTP-Protokolle des Anbieters, Umfang **nicht aus dem Code bestimmbar**, vermutlich inkl. IP-Adresse – zu klären D04) |
| Empfänger | Betrieb, Administration, Datenschutzstelle (Audit-Zugriff selbst protokolliert); Railway; GitHub erhält nur Ergebnisse der Erreichbarkeitsprüfung (`.github/workflows/uptime.yml`) |
| Auslandbekanntgabe | Railway – zu klären D04 |
| Aufbewahrung | Audit und Sicherheitsereignisse 180 Tage; erledigte Outbox-Ereignisse 14 Tage; Zähler 2 Tage; Lebenszeichen 7 Tage (`maintenance.ts`, `ops.ts`); Plattformlogs gemäss Railway-Einstellung (PRD: 14 Tage – **nicht belegt**); fehlgeschlagene/tote Outbox-Ereignisse, Sonderzugriffe, Rechteprüfungen: **keine Frist im Code** |
| Sicherheitsmassnahmen | Hash-Kette und Append-only-Trigger, Löschung nur durch Aufbewahrungsaufgabe (`app.retention_job`); `ms_app` ohne UPDATE/DELETE auf Audit (`docs/db-roles.sql`); Sonderzugriff mit Ticket, Zweck, zweiter Person, höchstens 60 min (`SPECIAL_ACCESS_MAX_MINUTES` in `src/server/modules/admin/roles.ts`, Ablauf `expire-grants` in `maintenance.ts`); Log-Schwärzung (`src/lib/log-safety.ts`) |
| Lücken | Der Sonderzugriff ist ein **organisatorischer Nachweis**: der tatsächliche Datenbankzugang (`railway connect Postgres`) wird technisch nicht durch die Freigabe begrenzt. DSV Art. 4 (Protokollierung, ggf. Aufbewahrung ≥ 1 Jahr) gegen 180 Tage prüfen – zu prüfen D01 |

## T12 Sicherungen

| Merkmal | Inhalt |
|---|---|
| Zweck | Wiederherstellung nach Datenverlust (NFR07 RPO ≤ 1 h, NFR08 RTO ≤ 4 h) |
| Betroffene | Alle oben genannten |
| Datenkategorien | Vollständiger Datenbankabzug (`pg_dump`) aller Schemas, **inkl. [bsP]**; bereits verschlüsselte Spalten bleiben zusätzlich mit `DATA_ENCRYPTION_KEY` verschlüsselt; Protokoll der Läufe ohne Inhalte – `ops.backup_runs` |
| Empfänger | Technische Betriebsleitung (Restore nur in neue Datenbank, RUNBOOKS R4); Railway (Bucket `ms-backups`, Region `ams`; zusätzlich Railway-Volume-Backups) |
| Auslandbekanntgabe | Wie Hosting; **gleicher Anbieter und gleiche Region wie die Datenbank** (RUNBOOKS R4) |
| Aufbewahrung | Stündliche Dumps 35 Tage (`RETENTION_DAYS` in `scripts/backup/format.ts`, Löschung in `scripts/backup/run.ts`); Laufprotokoll 35 Tage (`scripts/backup/journal.ts`); Railway-Volume-Backups gemäss Anbieter-Einstellung (≤ 35 Tage einzustellen, D04). Nach Löschauftrag können Kopien bis 65 Tage bestehen (PRD 11) |
| Sicherheitsmassnahmen | AES-256-GCM mit eigenem `BACKUP_ENCRYPTION_KEY`, getrennt von `DATA_ENCRYPTION_KEY`, zusätzlich offline zu verwahren; Rücklese- und Tag-Prüfung je Lauf; eigener, nicht öffentlicher Bucket; Alarme `backup_failed`, `backup_stale`; Löschjournal vor Wiederfreigabe (`scripts/apply-deletion-journal.ts`); Übung `npm run drill:restore` |
| Lücken | Frist über `BACKUP_RETENTION_DAYS` ohne Obergrenze änderbar; kein Zweitstandort; Schlüssel als Umgebungsvariable beim selben Anbieter |
