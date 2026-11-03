# Auftragsbearbeiter und Dienstleister (Entwurf)

> **ENTWURF – nicht freigegeben.** Stand 3. November 2026. Grundlage: `.railway/railway.ts`,
> `src/server/env.ts`, `src/server/storage.ts`, `src/server/mailer.ts`,
> `src/server/auth/password-leak.ts`, `.github/workflows/*`. Die Bewertung der
> Auslandbekanntgabe (Art. 16, 17 DSG) und der Auftragsbearbeitung (Art. 9 DSG) ist **zu prüfen
> durch Datenschutzberatung (D01)**; Beschaffung, Verträge und Länder sind **zu klären D04**.
> Es werden keine Firmenangaben, Adressen oder Vertragsdaten angenommen, die nicht im Repository
> belegt oder vorgegeben sind.

PRD 11 verlangt: «Zugriffsländer, Support, E-Mail, CDN, Fehlermonitoring und
Unterauftragsbearbeiter werden vollständig erfasst. Verträge, Weisungen, Schutzmassnahmen und
Auslandbekanntgaben sind vor Beauftragung zu prüfen. Ausländische Fernzugriffe sind in diese
Prüfung einzubeziehen.» \[Q4\]

## Übersicht

| Nr. | Dienstleister | Rolle | Personendaten | Status | Vertrag |
|---|---|---|---|---|---|
| AB01 | Railway | Auftragsbearbeiter (Hosting, Datenbank, Objektablage, Logs, Sicherungen) | ja, alle Kategorien inkl. [bsP] | **im Einsatz** (Testbetrieb mit Demo-Daten) | **offen** |
| AB02 | E-Mail-Versand (SMTP-Anbieter) | Auftragsbearbeiter | ja (E-Mail-Adresse, Mitteilungsinhalt) | **nicht gewählt** | **offen** |
| AB03 | Pwned Passwords (`api.pwnedpasswords.com`) | externer Abfragedienst | voraussichtlich keine (nur Hash-Präfix) | **optional, standardmässig aus** | **offen** |
| AB04 | GitHub | Code-Hosting, CI, Erreichbarkeitsprüfung | keine Plattformdaten (Bedingungen unten) | im Einsatz | **offen** |
| AB05 | Externer Erreichbarkeitsprüfer (NFR06) | Dienstleister | keine (nur Health-Endpunkte) | **nicht gewählt** (heute GitHub, AB04) | offen |
| AB06 | Werkzeuge der Trägerschaft: Ticketsystem, Passwortmanager/Tresor, Kanal der Rufbereitschaft | je nach Werkzeug | möglich (Ticketreferenzen, Konto-IDs) | **nicht gewählt** | offen |

Nicht im Einsatz (Stand Code): kein externes Fehlermonitoring, kein Analyse- oder Werbedienst,
keine externen Schriften (`next/font/local` in `src/app/layout.tsx`), kein separates CDN ausser der
Auslieferung durch Railway, kein Suchdienst (PostgreSQL-Volltext,
`src/server/modules/privacy/tasks.ts`). Jede Einführung eines solchen Dienstes erfordert einen
neuen Eintrag **vor** Beauftragung.

---

## AB01 Railway

| Merkmal | Inhalt |
|---|---|
| Anbieter | Railway; Unternehmen mit Sitz in den USA. Vertragspartei, Adresse: [aus Vertrag eintragen] |
| Leistungen (aus `.railway/railway.ts`) | Projekt «MS Plattform» mit Diensten `web` (Next.js), `worker` (Hintergrundarbeiter), `hilfe` (eigenständige Sicherheitsseite), `backup` (stündlicher Cron-Dienst), Datenbank `Postgres` (inkl. Volume und Volume-Backups), Buckets `ms-medien` (Medien und Exportdateien) und `ms-backups` (verschlüsselte Sicherungen), Plattformlogs und Metriken, TLS-Terminierung, Umgebungsvariablen (Geheimnisse) |
| Zweck | Betrieb der gesamten Plattform |
| Daten | Alle Kategorien aus `verzeichnis-bearbeitungstaetigkeiten.md` T01–T12, inkl. **[bsP]** (Gesundheitstagebuch, Inhalte, Mitgliedschaft). Zusätzlich: Schlüssel `DATA_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, Bucket- und SMTP-Zugangsdaten als Umgebungsvariablen (`preserve()` in `.railway/railway.ts`) |
| Schutz durch die Anwendung | Freitexte in Tagebuch, Nachrichten, Meldungen, Belegen, Einsprüchen, Kontaktformular, MFA-Geheimnisse und Exportdateien anwendungsseitig verschlüsselt (`src/server/crypto.ts`); Sicherungen mit eigenem Schlüssel verschlüsselt (`scripts/backup/format.ts`). **Einschränkung:** Die Schlüssel liegen als Umgebungsvariablen beim selben Anbieter; wer Zugriff auf Variablen und Datenbank hat, kann entschlüsseln. Skalenwerte, eigene Symptombezeichnungen, Community-Beiträge, Pseudonyme und E-Mail-Adressen liegen im Klartext in der Datenbank |
| Ort der Speicherung | Region Amsterdam, `europe-west4` (Dienste: `replicas: { "europe-west4": 1 }`; Buckets: `region: "ams"`), Niederlande |
| Zugriffsländer | Fernzugriff durch Support und Betrieb des Anbieters aus den USA möglich – **Umfang zu klären D04** |
| Unterauftragsbearbeiter | Betreiber von Rechenzentrum, Objektablage hinter «Railway Buckets», Log- und Metrikinfrastruktur: **beim Anbieter erfragen und hier eintragen** – zu klären D04 |
| Grundlage Auslandbekanntgabe | Niederlande: EU-Staat; ob die Angemessenheit gemäss Staatenliste (Anhang 1 DSV) als Grundlage genügt – **zu prüfen D01**. USA (Unternehmenssitz, Fernzugriff): mögliche Grundlagen sind eine Zertifizierung des Anbieters unter dem Swiss-U.S. Data Privacy Framework oder vertragliche Garantien (z. B. vom EDÖB anerkannte Standardvertragsklauseln mit Schweizer Anpassungen) – **Zertifizierungsstatus und Vertrag zu klären D04, Bewertung zu prüfen D01** |
| PRD-Abweichung | PRD 11: «Vorgabe ist primäre Datenhaltung einschliesslich Backups in der Schweiz.» `.railway/railway.ts` hält fest: «Railway bietet keine Schweizer Region … ist damit noch NICHT erfüllt und vor produktiven Daten zu entscheiden.» → **Entscheid D04** (Anbieterwechsel, Ausnahme mit Begründung oder Anpassung der Vorgabe) |
| Löschung beim Anbieter | Datenbank und Buckets durch die Anwendung (`src/server/modules/privacy/erasure.ts`, `export-jobs.ts`, `scripts/backup/run.ts`). Railway-Volume-Backups und Plattformlogs: Aufbewahrung **beim Anbieter einzustellen und zu belegen** (PRD: Logs 14 Tage, Backups ≤ 35 Tage; `docs/traceability/konto-datenschutz.md` «offen – D04») |
| Exit | Datenbank per `pg_dump` exportierbar (`scripts/backup/run.ts`, auch `--local`); Buckets S3-kompatibel (`@aws-sdk/client-s3`); Infrastruktur als Code (`.railway/railway.ts`). Löschnachweis nach Vertragsende beim Anbieter einholen – zu klären D04 |
| Meldepflicht des Anbieters | Vertraglich verlangen: Information der Verantwortlichen über Verletzungen der Datensicherheit so rasch als möglich (Art. 24 Abs. 3 DSG) – zu prüfen D01 |
| Vertragsstatus | **offen** – Auftragsbearbeitungsvereinbarung, Weisungsrecht, Unterauftragsbearbeiterliste, Auditrechte, Ort, Fernzugriff, Löschung, Sicherheitszusagen (Verschlüsselung der Volumes und Volume-Backups durch den Anbieter nachzuweisen, `docs/traceability/inhalte-betrieb-nfr.md` NFR09) |
| Zuständig | Technische Betriebsleitung [Person eintragen] mit Datenschutzkontaktstelle [Person eintragen] |

## AB02 E-Mail-Versand (SMTP-Anbieter)

| Merkmal | Inhalt |
|---|---|
| Anbieter | **noch nicht gewählt** – [Anbieter, Sitz, Vertragspartei eintragen] |
| Anbindung | SMTP über `nodemailer` mit `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (`src/server/env.ts`, `src/server/mailer.ts`). In Produktion ohne Konfiguration schlägt der Versand fehl (`SMTP ist nicht konfiguriert`); in der Entwicklung wird nur der Vorlagentyp und Link lokal protokolliert |
| Zweck | Transaktionsmails: E-Mail-Bestätigung, Passwort zurücksetzen, Adresswechsel, Sicherheitsmitteilungen, optionale Sammelhinweise, Inaktivitätsvorwarnung, Löschbeleg (Vorlagen `MailTemplate` in `src/server/mailer.ts`) |
| Daten | Empfängeradresse; Betreff und Text (neutral, ohne Diagnose, Gruppen-, Artikel- oder Nachrichtentexte); Links mit Einmal-Token (Bestätigung 24 h, Reset 30 min, `src/server/modules/account/tokens.ts`); Belegnummern; Absender und Signatur «MS Plattform … Akute Hilfe: Notruf 144». **Bereits Absender und Signatur verraten den Bezug zu MS** → beim Anbieter und im Postfach der Empfängerin [bsP]-nah |
| Ort, Zugriffsländer | [eintragen] – Vorgabe PRD 11: Schweiz bevorzugt; zu klären D04 |
| Unterauftragsbearbeiter | [eintragen] |
| Grundlage Auslandbekanntgabe | Abhängig vom gewählten Anbieter – **zu klären D04, zu prüfen D01** |
| Anforderungen an die Auswahl | Kein Öffnungs- oder Klicktracking und keine Link-Umschreibung (Mails sind reiner Text, die Anwendung setzt kein Tracking); Speicherung von Inhalten und Versandprotokollen nur so lange wie nötig, Frist vertraglich festhalten; TLS zum Anbieter; Löschung auf Weisung; Meldung von Sicherheitsverletzungen so rasch als möglich |
| Technischer Hinweis | `secure` ist nur bei Port 465 gesetzt (`src/server/mailer.ts`); bei Port 587 nutzt `nodemailer` STARTTLS, erzwingt es aber ohne `requireTLS` nicht. Vor Pilot Port 465 oder erzwungenes STARTTLS festlegen |
| Löschung | Teilschritt `vendors:mail_provider` der Kontolöschung wird heute ohne Prüfung als erledigt markiert mit dem Text «Versandprotokolle beim Dienstleister gemäss Auftragsbearbeitungsvertrag» (`NOT_APPLICABLE.vendors` in `src/server/modules/privacy/tasks.ts`). Dieser Beleg ist erst nach Vertragsabschluss zutreffend |
| Vertragsstatus | **offen** |
| Zuständig | Technische Betriebsleitung mit Datenschutzkontaktstelle |

## AB03 Pwned Passwords

| Merkmal | Inhalt |
|---|---|
| Anbieter | Betreiber des Dienstes Pwned Passwords, Endpunkt `https://api.pwnedpasswords.com/range/` (`src/server/auth/password-leak.ts`). [Betreiber und Sitz aus Nutzungsbedingungen eintragen] |
| Status | **Standardmässig aus**; Einschalten nur mit `PASSWORD_LEAK_CHECK=pwned` «bis D04 den Dienst freigibt» (Kommentar in `password-leak.ts`) |
| Zweck | Abweisen bekannter kompromittierter Passwörter (ACC04) bei Registrierung, Zurücksetzen und Passwortwechsel |
| Daten | Erste 5 Zeichen des SHA-1-Hashs des Passworts (k-Anonymität), gepolsterte Antwort (`Add-Padding`); User-Agent `ms-plattform-passwortpruefung`; Server-IP-Adresse von Railway. Kein Passwort, kein vollständiger Hash, keine E-Mail, kein Konto beim Dienst |
| Personendaten | Nach Code voraussichtlich keine Personendaten der Mitglieder – **zu prüfen D01** |
| Ausfallverhalten | Zeitlimit 2,5 s, bei Störung «nicht geprüft» (fail open); Log nur mit Fehlercode |
| Ort, Grundlage Auslandbekanntgabe | [eintragen]; falls keine Personendaten, entfällt die Prüfung nach Art. 16 DSG – **zu prüfen D01** |
| Vertragsstatus | **offen** (Nutzungsbedingungen prüfen, Freigabe D04) |

## AB04 GitHub

| Merkmal | Inhalt |
|---|---|
| Anbieter | GitHub (Repository `3pwebquery/ms` gemäss `.railway/railway.ts`); [Vertragspartei und Sitz aus Vertrag eintragen] |
| Leistungen | Quellcode, Pull Requests, CI (`.github/workflows/ci.yml` mit Typen, Lint, Tests, Build, Integrationstests gegen frische Test-Datenbanken), Erreichbarkeitsprüfung alle 5 Minuten (`.github/workflows/uptime.yml`, Repository-Variablen `MS_WEB_URL`, `MS_HILFE_URL`); Quelle für Railway-Deployments (`github("3pwebquery/ms", …)`) |
| Personendaten der Plattform | **keine** – Bedingungen: keine Produktionsdaten, Logs, Exporte, Dumps, Tickets mit Inhalten oder Geheimnisse im Repository, in Issues, PRs oder CI-Artefakten; Testdaten nur fiktiv (`scripts/seed/*`, NFR18); Erreichbarkeitsprüfung liest nur Health-Endpunkte (`/api/v1/health`, `/api/v1/health/worker`, `/health`) |
| Sonstige Personendaten | Git-Metadaten und Konten der Entwickelnden – nicht Teil der Plattformbearbeitung; im Personalbereich der Trägerschaft zu behandeln |
| Grundlage Auslandbekanntgabe | Entfällt für Plattformdaten, solange die Bedingungen eingehalten werden – **zu prüfen D01** |
| Kontrolle | Regel in Code-Review; `src/lib/log-safety.test.ts` verhindert Inhalte in Logaufrufen; `.env.example` ohne Werte (NFR10) |
| Vertragsstatus | **offen** (Nutzungsbedingungen der Organisation prüfen) |

## AB05 Externer Erreichbarkeitsprüfer

PRD/NFR06 verlangt einen neutralen externen Prüfer im Minutentakt (`docs/RUNBOOKS.md`
«Alarmierung»). Bis zur Wahl übernimmt GitHub (AB04) alle 5 Minuten. Daten: nur Antworten der
Health-Endpunkte. [Anbieter, Ort, Vertrag eintragen] – zu klären D04.

## AB06 Werkzeuge der Trägerschaft

| Werkzeug | Verwendung laut `docs/RUNBOOKS.md` | Erwartete Daten | Status |
|---|---|---|---|
| Ticketsystem | Jeder Betriebsschritt mit Ticket; Sonderzugriff mit Ticket; Vorfälle I01–I04 | Ticketreferenz, Zeitpunkte, Personen der Trägerschaft, Konto-IDs/Korrelations-IDs – **keine Inhalte, Gesundheitswerte, E-Mail-Adressen oder Pseudonyme** (RUNBOOKS «Grundsätze») | [eintragen] |
| Passwortmanager / Tresor | `DATA_ENCRYPTION_KEY` (R9), `BACKUP_ENCRYPTION_KEY` offline (R4) | Schlüssel | [eintragen] |
| Kanal der Rufbereitschaft | Alarmempfang, Vertretung | Namen und Erreichbarkeit der Mitarbeitenden | [eintragen] |
| Postfach der Datenschutzkontaktstelle | `{{org.privacyEmail}}` in `scripts/seed/content/legal.ts` | Anliegen Betroffener, ggf. [bsP] | [eintragen] |

## Prüfliste je neuem Dienstleister (vor Beauftragung)

1. Zweck und Datenkategorien; sind [bsP] betroffen?
2. Speicherort, Zugriffsländer inkl. Support und Fernwartung, Unterauftragsbearbeiter.
3. Grundlage der Auslandbekanntgabe (Art. 16, 17 DSG) – zu prüfen D01.
4. Vertrag: Bearbeitung nur auf Weisung, Vertraulichkeit, Sicherheit (Art. 8 DSG), Meldung von
   Verletzungen, Löschung/Rückgabe, Auditrechte, Genehmigung von Unterauftragsbearbeitern (Art. 9
   DSG).
5. Aufbewahrung beim Dienstleister; Eintrag in `aufbewahrungsplan.md`.
6. Einbezug in Löschaufträge (`src/server/modules/privacy/tasks.ts`, System `vendors`) und
   Exit-Plan.
7. Eintrag in diesem Dokument, im Verzeichnis und in der Datenschutzinformation
   (`{{org.processors}}`, `{{org.dataLocations}}` in `scripts/seed/content/legal.ts`).
