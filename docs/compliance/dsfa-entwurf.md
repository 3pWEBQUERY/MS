# Datenschutz-Folgenabschätzung (Entwurf)

> **ENTWURF – nicht freigegeben.** Stand 3. November 2026. Erstellt aus PRD (Kapitel 3, 8, 10, 11,
> 15, 18) und dem Code des Branches `claude/laughing-bell-1whiqu`. Die Einstufungen sind eine
> **technische Erstbewertung** und ersetzen nicht die Bewertung durch Trägerschaft und
> Datenschutzberatung. Rechtliche Aussagen sind **zu prüfen durch Datenschutzberatung (D01)**;
> Freigabe der DSFA, der Restrisiken und des Konsultationswegs in **D05** \[Q2\].

## 1 Gegenstand und Status

| Angabe | Inhalt |
|---|---|
| Verantwortliche | [Trägerschaft eintragen] |
| Verfasst von | [Datenschutzkontaktstelle eintragen], technische Vorlage aus der Codebasis |
| Beteiligt | Technische Betriebsleitung, Moderationsleitung, medizinische Redaktionsleitung, Product Owner, Betroffenenvertretung (D06) [Personen eintragen] |
| Version | Entwurf 0.1 |
| Nächste Überprüfung | vor Pilotstart und vor jedem weiteren Gate (PRD 18) |

Erforderlichkeit: Art. 22 Abs. 1 und 2 DSG verlangt eine DSFA bei voraussichtlich hohem Risiko,
insbesondere bei umfangreicher Bearbeitung besonders schützenswerter Personendaten. Die Plattform
bearbeitet Gesundheitsdaten einer Zielgruppe, deren Mitgliedschaft bereits auf eine Erkrankung
schliessen lässt. Ob die gesetzliche Pflicht greift (Umfang im Pilot), ist **zu prüfen D01**; PRD 11
macht die DSFA unabhängig davon zur internen Freigabebedingung.

## 2 Beschreibung der Bearbeitung

**Zweck des Angebots:** Webplattform für Erwachsene mit MS in der Schweiz: freiwillige private
Alltagsdokumentation («Mein MS»), moderierte Community unter Pseudonym, private Gespräche nach
gegenseitiger Zustimmung, geprüftes Wissen, Verzeichnis von Hilfsangeboten, Sicherheitsseite.
Keine Diagnose-, Therapie- oder Interpretationsfunktion (PRD 02, D02).

**Bearbeitungstätigkeiten:** T01–T12 in `verzeichnis-bearbeitungstaetigkeiten.md`.

**Systemübersicht** (aus `.railway/railway.ts`):

```
Browser ──TLS──> Railway (Amsterdam, europe-west4)
                  ├─ web     Next.js, Server Actions, API v1  ──┐
                  ├─ worker  Fristen, Löschung, Export, Mitteilungen ─┤── Postgres (Schemas identity, health,
                  ├─ hilfe   Sicherheitsseite ohne Next.js     ──┘    community, messaging, content,
                  ├─ backup  stündlich pg_dump → AES-256-GCM          moderation, privacy, ops, analytics)
                  ├─ Bucket ms-medien   (media/, exports/)
                  └─ Bucket ms-backups  (postgres/…dump.enc, 35 Tage)
worker ──SMTP──> E-Mail-Anbieter (noch nicht gewählt) ──> Postfach der Mitglieder
web ──(optional, aus)──> Pwned Passwords (5 Zeichen SHA-1-Präfix)
GitHub: Quellcode, CI, Erreichbarkeitsprüfung (keine Plattformdaten)
```

**Datenflüsse mit [bsP]:** Tagebuch (nur Inhaberin ↔ Datenbank ↔ Export), Community-Beiträge
(Mitglied → andere Mitglieder, Moderation), Nachrichten (Mitglied ↔ Gesprächspartner, verschlüsselt
gespeichert), Meldungen und Belege (Mitglied → Moderation), Kontaktformular (Gast/Mitglied →
Redaktion bzw. Datenschutzstelle), Sicherungen (Gesamtbestand → `ms-backups`).

**Rollen mit Zugriff** (PRD 03, `src/server/db/schema/identity.ts` `staff_role`): `moderator`,
`moderation_lead`, `editor`, `medical_reviewer`, `admin`, `ops`, `privacy_officer`. Keine Rolle hat
Lesezugriff auf das Gesundheitstagebuch. Technischer Betrieb hat über Railway Zugriff auf
Datenbank und Umgebungsvariablen (Sonderzugriff organisatorisch, siehe R-03).

## 3 Notwendigkeit und Verhältnismässigkeit

| Grundsatz | Umsetzung (Beleg) | Bewertung / offen |
|---|---|---|
| Zweckbindung | Getrennte Schemas je Fachmodul; Gesundheit nur für Inhaberin (PRD 03, RLS); Analytics eigenes Schema ohne Bezug zu Tagebuch und Moderation (`src/server/db/schema/analytics.ts`); keine Nutzung privater Inhalte für Training, Forschung, Produktanalyse (PRD 11) | Zweck- und Rechtsgrundlagenmatrix fehlt (D01) |
| Freiwilligkeit | Gesundheitsbereich gesondert, nicht vorausgewählt, Kernfunktionen ohne Gesundheitsdaten nutzbar; Statistik standardmässig aus (`src/lib/analytics.ts`, `consent_records`) | Bedeutung der Einwilligung je Zweck zu prüfen D01 |
| Datenminimierung | Pseudonym statt Name; keine Diagnose- oder Ausweisnachweise; Kanton optional; Tagebuchfelder alle optional; keine Uhrzeit in Analytics; Outbox-Nutzlast nur IDs bzw. verschlüsselte Adresse; Mitteilungen ohne Text (`messaging.notifications`); Logs ohne Inhalte (`src/lib/log-safety.ts`) | IP-Adressen ungehasht in Drosselung (2 Tage); Zielgruppenbestätigung im Restdatensatz gelöschter Konten |
| Speicherbegrenzung | Fristen A01–A29 (`aufbewahrungsplan.md`) | 14 Datenklassen ohne Löschregel (Abschnitt C dort) |
| Richtigkeit, Rechte | Berichtigung, Export, Auskunft, Löschung über S15/S58 (`src/server/modules/privacy/*`) | Gesetzliche Fristenliste fehlt (D01) |
| Transparenz | Datenschutzinformation `scripts/seed/content/legal.ts` (Entwurf mit Platzhaltern) | Abweichungen in Abschnitt 6 |
| Datenschutz durch Technik und Voreinstellungen (Art. 7 DSG) | Standard «verweigert»; Statistik aus; E-Mail-Sammelhinweise aus (`email_social` default `false`); Auffindbarkeit abschaltbar | – |
| Alternativen | Native Apps, Freigaben an Fachpersonen, Forschung bewusst nicht im MVP (PRD 02) | – |

## 4 Methode der Risikobewertung

Eintrittswahrscheinlichkeit (W) und Schwere (S) je **G** gering, **M** mittel, **H** hoch, in
Anlehnung an das Risikoregister PRD 18 (H/M). Bewertet wird das Risiko **für die betroffenen
Personen**, nicht für die Trägerschaft. «Vor» = ohne Massnahmen, «Rest» = mit den im Code
umgesetzten Massnahmen, unter Annahme der technischen Pilot-Voraussetzungen aus Abschnitt 7.

| | S = G | S = M | S = H |
|---|---|---|---|
| **W = H** | mittel | hoch | hoch |
| **W = M** | gering | mittel | hoch |
| **W = G** | gering | gering | mittel |

## 5 Risiken und Massnahmen

### Übersicht

| ID | Risiko | Vor W/S | Rest W/S | Restrisiko |
|---|---|---|---|---|
| R-01 | Unbefugter Zugriff auf Gesundheitsdaten | M/H | G/H | mittel |
| R-02 | Offenlegung der Mitgliedschaft (E-Mail ↔ Plattform, Pseudonym ↔ Person) | M/H | M/H | **hoch** |
| R-03 | Missbrauch privilegierter Zugriffe (Mitarbeitende, Betrieb, Anbieter) | M/H | M/H | **hoch** bis Massnahmen D04/D07 |
| R-04 | Community-Missbrauch: Belästigung, Doxxing, Ausnutzung, Weitergabe von Screenshots | H/H | M/H | **hoch** |
| R-05 | Krisen von Mitgliedern werden nicht erkannt oder falsch beantwortet | M/H | M/H | **hoch** bis D03 |
| R-06 | Auslandbekanntgabe: Speicherung Amsterdam, US-Anbieter, E-Mail-Anbieter offen | H/M | H/M | **hoch** bis D04 |
| R-07 | Kompromittierung der Schlüssel (Umgebungsvariablen) | M/H | M/H | **hoch** |
| R-08 | Unvollständige oder zu späte Löschung | M/M | G/M | gering |
| R-09 | Datenverlust oder lange Nichtverfügbarkeit | M/M | G/M | gering bis mittel |
| R-10 | Fehlkonfiguration im Betrieb (Rollen, Demo-Daten, eine Umgebung) | H/H | **H/H solange offen** | **hoch** bis behoben |
| R-11 | Rückführbarkeit der Nutzungsstatistik | G/M | G/G | gering |
| R-12 | Personendaten in Logs und Protokollen | M/M | G/M | gering |
| R-13 | Medizinische Fehlinterpretation, Einordnung als Medizinprodukt | M/H | M/M | mittel bis D02 |

### R-01 Unbefugter Zugriff auf Gesundheitsdaten

- **Szenario:** Fehler in einer Abfrage, IDOR, gestohlene Sitzung, Zugriff über Mitarbeitendenrolle.
- **Massnahmen im Code:** Eigenes Schema `health` mit RLS je Inhaber
  (`drizzle/0001_rls_and_integrity.sql`); Zugriff nur über `withOwnerScope` und `accountId`-Filter
  (`src/server/db/scoped.ts`, `docs/ENGINEERING.md`); keine Rolle mit Leserecht (PRD 03);
  Notizen verschlüsselt (`src/server/crypto.ts`); Sitzung 12 h/60 min, `__Host-`-Cookie,
  `httpOnly` (`src/server/auth/session.ts`); erneute Anmeldung für Export (`requireRecentAuth`);
  Fremdzugriffe als Sicherheitsereignis (`recordDenied`); private Caches (`src/proxy.ts`); Tests
  mit Rolle ohne BYPASSRLS (`npm run test:db`, `docs/traceability/README.md`).
- **Lücken:** RLS wirkt nur, wenn `web` mit `ms_app` verbindet – `.railway/railway.ts` setzt die
  Eigentümer-URL. Skalenwerte und eigene Symptombezeichnungen unverschlüsselt
  (`src/server/db/schema/health.ts`). Kein Pentest (NFR12 offen).
- **Restrisiko:** mittel, Voraussetzung `ms_app` (Abschnitt 7).

### R-02 Offenlegung der Mitgliedschaft

- **Szenario:** E-Mails mit Absender/Signatur «MS Plattform» sind im Postfach (Arbeitgeber,
  Familie) sichtbar; Datenabfluss von `identity.accounts` (E-Mail im Klartext); Pseudonym lässt
  Rückschluss auf Person zu (Selbstoffenbarung in Beiträgen, Kanton, Interessen).
- **Massnahmen:** E-Mail nie in Community-Abfragen und nie im Profil (PRD 03, `docs/ENGINEERING.md`);
  neutrale Mailtexte ohne Gesundheitsangaben (`src/server/mailer.ts`); keine Kontoaufzählung bei
  Registrierung/Reset; Auffindbarkeit abschaltbar (`community_profiles.discoverable`); Kanton
  optional; Hinweis vor Registrierung, dass Mitgliedschaft Rückschlüsse erlaubt (PRI01,
  Datenschutzinformation «Bitte beachte»).
- **Lücken:** Absendername und Signatur enthalten «MS» (`SIGNATURE` in `src/server/mailer.ts`) –
  neutralere Absenderwahl prüfen (D09 Name). E-Mail-Adressen unverschlüsselt in der Datenbank
  (für Anmeldung nötig; Hash-Index wäre eine Option).
- **Restrisiko:** hoch – teilweise der Natur des Angebots geschuldet; Akzeptanz durch Trägerschaft
  nötig.

### R-03 Missbrauch privilegierter Zugriffe

- **Szenario:** Administration liest Inhalte; Betrieb liest Datenbank direkt; Anbieter-Support
  greift zu; ausgetretene Person hat noch Railway-Zugang.
- **Massnahmen:** Rollen getrennt, MFA-Pflicht (`requireStaff`, `src/server/auth/viewer.ts`);
  Rollen befristbar (Enddatum ≤ 2 Jahre, ohne Enddatum unbefristet, `role-actions.ts`); Austritt entzieht Rollen und Sitzungen
  (RUNBOOKS R5); Audit mit Hash-Kette, nur anhängbar (`src/server/audit.ts`,
  `drizzle/0001_rls_and_integrity.sql`); Sonderzugriff mit Ticket, Zweck, zweiter Person, ≤ 60 min
  (`src/server/modules/admin/role-actions.ts`, `roles.ts`); Audit-Zugriff protokolliert (PRI07);
  quartalsweise Rechteprüfung (`ops.access_reviews`); Vieraugenprinzip Datenschutzstelle (Seed).
- **Lücken:** Sonderzugriff ist nur Nachweis – der Datenbankzugang über Railway ist **nicht
  technisch** an die Freigabe gebunden; wer Variablen lesen darf, hat `DATA_ENCRYPTION_KEY` und
  die Eigentümer-URL. Administration liest Datenschutzanliegen im Kontaktformular
  (`src/server/modules/content/editorial-queries.ts`) – mit PRD 03 abgleichen. Interne
  Moderationsnotizen im Klartext (`moderation.actions.internal_note`).
- **Restrisiko:** hoch, bis Railway-Rollen/Teamrechte minimiert, dokumentiert und vertraglich
  abgesichert sind (D04, D07).

### R-04 Community-Missbrauch

- **Szenario:** Belästigung, Doxxing, Ausnutzung verletzlicher Personen, Betrug, Screenshots aus
  Gesprächen.
- **Massnahmen:** Kontakt nur nach gegenseitiger Zustimmung, Verfall 14 Tage, Sperrfrist 30 Tage
  (`maintenance.ts`); Blockierung beidseitig; Drosselung Beiträge, Antworten, Nachrichten, Meldungen
  (`LIMITS`, `src/server/rate-limit.ts`); Meldung mit Belegnummer, Belege unveränderlich
  (`drizzle/0003_evidence_immutable.sql`); P0-Alarm an Moderationsleitung, Fristüberwachung
  (`src/worker/handlers/moderation.ts`); zweite Freigabe für schwere Massnahmen; unabhängiger
  Einspruch; Community-Regeln mit erneuter Bestätigung bei Änderung.
- **Lücken:** Moderation nur zu Betriebszeiten (Community-Regeln: «täglich von 9 bis 18 Uhr»);
  Kapazität und Vertretung D03 offen (PRD 18 R02, R05). Screenshots technisch nicht verhinderbar.
- **Restrisiko:** hoch; Minderung vor allem organisatorisch (D03).

### R-05 Krisen

- **Szenario:** Mitglied äussert Suizidgedanken in Beitrag oder Chat ausserhalb der Moderationszeit;
  Hilfeweg falsch oder nicht erreichbar.
- **Massnahmen:** Sicherheitsseite ohne Login, Rückfallliste (`src/lib/safety-static.ts`),
  eigenständiger Dienst `hilfe` (`src/static-help/server.ts`); Aktivierung von Kontakten nur nach
  fachlicher Verifikation, Alarm `safety_verification_overdue`; Notruf 144 als feste Schaltfläche
  (RUNBOOKS R7); Hinweis «kein Notfalldienst» in Regeln und Bedingungen.
- **Lücken:** Verifizierte Kontakte, Krisenprotokoll, Schulung, Dienstplan fehlen (D03; PRD 10
  «eine falsche oder nicht verfügbare Hilferoute blockiert die Freigabe»).
- **Restrisiko:** hoch bis D03 erfüllt; Launch-Blocker gemäss PRD.

### R-06 Auslandbekanntgabe

- **Szenario:** Daten liegen in den Niederlanden bei einem US-Unternehmen; Fernzugriff aus den USA;
  E-Mail-Anbieter unbekannt; PRD-Vorgabe Schweiz nicht erfüllt.
- **Massnahmen:** Anwendungsseitige Verschlüsselung der Freitexte und Exporte; Sicherungen mit
  eigenem Schlüssel; keine weiteren Drittdienste (`auftragsbearbeiter.md`); Pwned Passwords aus.
- **Lücken:** Kein Vertrag, keine geprüfte Grundlage für den USA-Bezug, keine
  Unterauftragsbearbeiterliste (D04); Schlüssel beim selben Anbieter (R-07) – die Verschlüsselung
  schützt daher nicht gegen den Anbieter selbst.
- **Restrisiko:** hoch bis D04 entschieden; **zu prüfen D01**.

### R-07 Schlüssel als Umgebungsvariable

- **Szenario:** `DATA_ENCRYPTION_KEY` und `BACKUP_ENCRYPTION_KEY` werden über Railway-Variablen,
  Logs der Plattform, ein kompromittiertes Konto oder eine ausgetretene Person bekannt.
- **Massnahmen:** Schlüssel nicht im Repository, Browser oder Log (NFR10, `preserve()` in
  `.railway/railway.ts`, `.env.example` ohne Werte); Produktion ohne Schlüssel schlägt fehl
  (`docs/ENGINEERING.md`); getrennter Backup-Schlüssel, offline verwahrt (R4); geordnete Rotation
  mit Lese-Fallback `OLD_DATA_ENCRYPTION_KEY` und Umverschlüsselung (`src/server/crypto.ts`,
  `scripts/rotate-data-key.ts`, RUNBOOKS R9); Empfehlung jährliche Rotation.
- **Lücken:** Kein KMS/HSM, keine Trennung von Schlüssel und Daten beim Anbieter
  (`docs/traceability/inhalte-betrieb-nfr.md` NFR09 «teilweise»); `web` und `worker` teilen
  denselben Schlüssel; Schlüssel decken alle Freitextarten gemeinsam ab (keine Schlüssel je
  Datenklasse).
- **Restrisiko:** hoch; Optionen (KMS ausserhalb des Hosters, getrennte Schlüssel) in D04/D07.

### R-08 Unvollständige oder zu späte Löschung

- **Massnahmen:** Zustandsautomat mit Teilschritten über Datenbank, Objektablage, Warteschlangen,
  Prüfung vor Abschluss (`src/server/modules/privacy/erasure.ts`, `tasks.ts`); Eskalation nach 5
  Fehlversuchen, Alarm `privacy_request_failed`; Löschjournal für Restores
  (`scripts/apply-deletion-journal.ts`); automatische Fristen (`aufbewahrungsplan.md`).
- **Lücken:** 14 Datenklassen ohne Frist (insbesondere Kontaktformular, Falldaten der Moderation,
  Datenschutzaufträge); Teilschritt E-Mail-Anbieter ohne realen Nachweis (`NOT_APPLICABLE.vendors`);
  Railway-Logs und Volume-Backups nicht eingestellt (A30, A31).
- **Restrisiko:** gering, wenn Abschnitt C des Aufbewahrungsplans entschieden ist.

### R-09 Datenverlust, Nichtverfügbarkeit

- **Massnahmen:** Stündliche verschlüsselte Sicherung mit Rücklesekontrolle (`scripts/backup/run.ts`),
  Alarme `backup_failed`/`backup_stale`, Restore-Übung (`npm run drill:restore`), Runbooks R4/R6,
  Hilfe-Dienst unabhängig von `web`; eigene Tagebuchdaten exportierbar.
- **Lücken:** Gleicher Anbieter und gleiche Region, kein Zweitstandort, keine PITR (R4, NFR07
  «teilweise»); Restore-Übung auf Zielumgebung fehlt.
- **Restrisiko:** gering bis mittel.

### R-10 Fehlkonfiguration im Betrieb (aktueller Stand)

- **Befunde im Code:** `SEED_DEMO: "true"` am Dienst `web` (`.railway/railway.ts`); `web` und
  `hilfe` mit Eigentümer-`DATABASE_URL` statt `ms_app` bzw. `ms_hilfe_ro` (`docs/db-roles.sql`);
  nur eine Railway-Umgebung (NFR18 «teilweise»); SMTP-TLS bei Port 587 nicht erzwungen
  (`src/server/mailer.ts`, `secure` nur bei 465).
- **Massnahme:** Abschnitt 7, Punkte 1–4 vor produktiven Daten. Danach Neubewertung (erwartet G/H,
  mittel).

### R-11 Nutzungsstatistik

- **Massnahmen:** Nur mit Einwilligung, fünf Ereignisse ohne Inhalte/IDs, Kalendertag ohne Uhrzeit,
  Bezug ≤ 30 Tage, Ausgabe ab 10 Personen, sofortige Löschung bei Widerruf
  (`src/lib/analytics.ts`, `src/server/modules/analytics/*`, `src/worker/handlers/analytics.ts`).
- **Lücke:** Bezeichnung «anonym» in Datenschutzinformation/Onboarding unzutreffend (pseudonym).

### R-12 Logs und Protokolle

- **Massnahmen:** `redactLogText` und automatisierte Prüfung verbotener Felder
  (`src/lib/log-safety.ts`, `src/lib/log-safety.test.ts`); Korrelations-ID statt Inhalte;
  `pg_dump`-Fehler ohne URL (`scripts/backup/run.ts`); Audit ohne Freitext.
- **Lücken:** Umfang der Railway-HTTP-Logs (IP, Pfade, User-Agent) und deren Frist nicht bekannt
  (D04); Fehlermeldung im Backup-Fehlerpfad wird nur gekürzt, nicht über `redactLogText`
  geschwärzt (`scripts/backup/run.ts`, `main().catch`).

### R-13 Medizinische Einordnung

Nicht primär Datenschutz, beeinflusst aber Zweck und Schutzbedarf: Skalen, Export, Texte und
Vermarktung sind in D02 einzuordnen (PRD 11, Q6). Keine Interpretation von Tagebucheinträgen im
Code; Skalenversion je Eintrag (`scale_version` in `src/server/db/schema/health.ts`).

## 6 Abgleich Datenschutzinformation und Code

Datenschutzinformation: `scripts/seed/content/legal.ts`, Slug `datenschutz`.

| Nr. | Aussage in der Datenschutzinformation | Stand im Code | Handlungsbedarf |
|---|---|---|---|
| G1 | «Meldungen und Belege: 180 Tage nach Abschluss des Falls» | Nur Belege und Meldungsdetails werden gelöscht; Fälle, Massnahmen (inkl. interner Notiz), Sanktionen, Einsprüche bleiben (`src/worker/handlers/moderation.ts`) | Frist ausdehnen oder Text präzisieren (D05) |
| G2 | Kontaktformular als Datenkategorie genannt, aber keine Frist | Keine Löschregel (`content.contact_messages`) | Frist festlegen und nennen |
| G3 | «anonyme Nutzungsstatistik» | Rohdaten bis 30 Tage pseudonym über `analytics.subjects.account_id` | «pseudonym» oder «ohne Namen» formulieren; nur Aggregate sind anonym |
| G4 | «Freitexte wie Tagebuchnotizen und Nachrichten werden verschlüsselt» | Eigene Symptombezeichnungen und `label_snapshot` sind Freitext im Klartext (`health.symptom_definitions`, `health.symptom_observations`) | Verschlüsseln oder Aussage präzisieren |
| G5 | «Technische Protokolle ohne Inhalte – für Sicherheit und Betrieb» | IP-Adressen ungehasht in Drosselungsschlüsseln (`auth-actions.ts`), Railway-HTTP-Logs unbekannten Umfangs | IP-Adressen und Frist nennen bzw. hashen; Railway-Logs klären (D04) |
| G6 | «Ziel ist eine primäre Datenhaltung einschliesslich Backups in der Schweiz» | Amsterdam (`.railway/railway.ts`) | `{{org.dataLocations}}` wahrheitsgemäss füllen (NL, US-Anbieter) |
| G7 | «Backups: rollierend höchstens 35 Tage» | Eigene Dumps 35 Tage; Railway-Volume-Backups nicht eingestellt | Einstellung beim Anbieter belegen (A30) |
| G8 | Dienstleister «etwa für Hosting, Datenbank, Objektablage und E-Mail-Versand» | E-Mail-Anbieter nicht gewählt; Platzhalter `{{org.processors}}` | Nach D04 füllen |
| G9 | «Einwilligungsnachweise: während der Nutzung und vorgeschlagen 3 Jahre danach» | Umgesetzt ab Deaktivierung (`purgeOldConsentProofs`) | entspricht |
| G10 | «Du kannst … dein Konto löschen» (Löschung über alle Systeme, PRI05/PRI06) | Teilschritt «Auftragsbearbeiter (E-Mail-Versand)» wird ohne Anbieter und Vertrag als erledigt belegt (`NOT_APPLICABLE.vendors` in `tasks.ts`) | Belegtext anpassen, bis ein Vertrag besteht |
| G11 | Nicht erwähnt: Gerätetyp/Browserfamilie der Sitzungen, Mitteilungen per E-Mail mit «MS»-Absender | `identity.sessions`, `src/server/mailer.ts` | In Datenkategorien aufnehmen |
| G12 | Nicht erwähnt: Datenschutzaufträge und Löschjournal bleiben nach Kontolöschung | `privacy.requests`, `privacy.deletion_journal` ohne Frist | Frist festlegen und nennen |

## 7 Technische Voraussetzungen vor produktiven Daten

1. `web` mit Rolle `ms_app` verbinden; RLS-Test «muss 0 Zeilen liefern» (`docs/db-roles.sql`)
   auf der Zielumgebung ausführen.
2. `hilfe` mit `ms_hilfe_ro` verbinden.
3. `SEED_DEMO=false`, `DEMO_MODE` aus; getrennte Produktionsumgebung (NFR18).
4. SMTP mit erzwungener Transportverschlüsselung.
5. Railway-Teamrechte minimal (wer sieht Variablen, wer verbindet zur Datenbank), Liste in
   `auftragsbearbeiter.md` dokumentieren.
6. Aufbewahrung Railway-Logs (14 Tage) und Volume-Backups (≤ 35 Tage) einstellen.
7. Restore-Übung mit Löschjournal auf der Zielumgebung (AT09).
8. Entscheide zu Abschnitt C des Aufbewahrungsplans umsetzen.

## 8 Restrisiken und Akzeptanz

| ID | Restrisiko | Begründung für Akzeptanz / weitere Massnahme | Entscheid | Verantwortlich | Datum |
|---|---|---|---|---|---|
| R-02 | Mitgliedschaft erkennbar | [Begründung eintragen] | [akzeptiert / Massnahme] | [Trägerschaft] | [ ] |
| R-03 | Privilegierte Zugriffe über Hoster | [ ] | [ ] | [ ] | [ ] |
| R-04 | Community-Missbrauch | [ ] | [ ] | [Moderationsleitung] | [ ] |
| R-05 | Krisen | Launch-Blocker bis D03 | [ ] | [ ] | [ ] |
| R-06 | Auslandbekanntgabe | [ ] | [ ] | [ ] | [ ] |
| R-07 | Schlüssel beim Hoster | [ ] | [ ] | [ ] | [ ] |
| R-10 | Fehlkonfiguration | darf nicht akzeptiert werden – beheben | – | Technische Betriebsleitung | [ ] |

**Konsultation:** Verbleibt nach den Massnahmen ein hohes Risiko, ist vorgängig der EDÖB zu
konsultieren (Art. 23 Abs. 1 DSG); davon kann abgesehen werden, wenn eine Datenschutzberaterin
oder ein Datenschutzberater nach Art. 10 DSG konsultiert wurde (Art. 23 Abs. 4 DSG). Welcher Weg
gilt, ist **zu prüfen D01/D05** (PRD 11: «der erforderliche Konsultationsweg bei hohem
Restrisiko ist rechtlich festzulegen»).

## 9 Offene Entscheidungen (PRD 18)

| ID | Entscheidung | Bezug zu dieser DSFA | Benötigt bis |
|---|---|---|---|
| D01 | Trägerschaft und Rechtsrahmen | Verantwortliche, DSGVO-Anwendbarkeit, Rechtsgrundlagen je Zweck, Rechtefristen, Melde- und Protokollpflichten (DSV Art. 4, 15), Konsultationsweg; alle mit «zu prüfen D01» markierten Punkte | vor produktiven Daten |
| D02 | Zweckbestimmung und Skalen | Einordnung Medizinprodukt (R-13); bestimmt Schutzbedarf und ggf. weitere Pflichten | vor Inhalts- und Designfreeze |
| D03 | Moderation und Krise | Dienstplan, Vertretung, Krisenprotokoll, verifizierte Hilfewege (R-04, R-05) | vor Pilot |
| D04 | Hosting und Lieferanten | Schweizer Region oder begründete Ausnahme, Verträge, Zugriffsländer, Unterauftragsbearbeiter, Schlüssel (KMS), Exit, E-Mail-Anbieter, Pwned Passwords (R-03, R-06, R-07) | vor Beschaffung |
| D05 | Aufbewahrung und DSFA | Freigabe der Fristen inkl. Abschnitt C, Freigabe dieser DSFA und der Restrisiken | vor produktiven Daten |
| D06 | Pilotziele und Beteiligung | Umfang des Pilots (bestimmt «umfangreich»), Teilnahmeinformation, Einladungsweg | vor Pilot |
| D07 | Architekturdetails und Kapazität | Rollen/Umgebungen, PITR/Zweitstandort, Schlüsselverwaltung, Pentest (R-09, R-10) | vor Implementierungsfreeze |
| D08 | Redaktion und Nutzungsrechte | Prüfende Personen und Nachweisfristen (T06) | vor Publikation |
| D09 | Name, Finanzierung, Ausbau | Produktname/Absender in E-Mails (R-02); Budget für Moderation und Betrieb (R-04, R-05) | vor öffentlichem Launch |

## 10 Freigabe

| Rolle | Name | Entscheidung | Datum | Auflagen |
|---|---|---|---|---|
| Datenschutzkontaktstelle | [ ] | [ ] | [ ] | [ ] |
| Technische Betriebsleitung | [ ] | [ ] | [ ] | [ ] |
| Moderationsleitung | [ ] | [ ] | [ ] | [ ] |
| Datenschutzberatung (D01) | [ ] | [ ] | [ ] | [ ] |
| Trägerschaft | [ ] | [ ] | [ ] | [ ] |
