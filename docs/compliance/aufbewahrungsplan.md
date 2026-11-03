# Aufbewahrungsplan (Entwurf)

> **ENTWURF – nicht freigegeben.** Stand 3. November 2026. Alle Fristen sind **exakt aus dem Code**
> übernommen (Fundstelle je Zeile). Die Werte in PRD 11 sind «vorgeschlagene betriebliche
> Obergrenzen, keine gesetzlichen Pauschalfristen»; Freigabe oder begründete Änderung durch
> Datenschutzberatung und Trägerschaft in **D05**. Gesetzliche Aufbewahrungs- oder
> Protokollierungspflichten sind **zu prüfen durch Datenschutzberatung (D01)**.

Grundsatz (PRD 11): «Eine längere Aufbewahrung benötigt einen konkreten Zweck, eingeschränkten
Zugriff und ein Enddatum.» Änderungen an einer Frist im Code erfordern die Nachführung dieser
Tabelle und der Datenschutzinformation (`scripts/seed/content/legal.ts`).

Ausführung: Periodische Aufgaben laufen im Railway-Dienst `worker` (`src/worker/index.ts`,
Registrierung in `src/worker/registry.ts`); Sicherungen im Cron-Dienst `backup`
(`.railway/railway.ts`, Zeitplan `17 * * * *`). Fällt der Arbeiter aus, verzögern sich alle
Fristen – Alarm `worker_inactive` bzw. `queue_age` (`docs/RUNBOOKS.md` R2).

## A Fristen im Code

| ID | Datenklasse | Frist im Code | Mechanismus und Takt | Fundstelle | PRD 11 | Abgleich |
|---|---|---|---|---|---|---|
| A01 | Unbestätigte Konten | 7 Tage ab Erstellung | Löschung `identity.accounts` (Kaskade auf abhängige Zeilen), stündlich | `RETENTION.unverifiedDays` in `src/server/modules/privacy/retention-rules.ts`; Aufgabe `unverified-accounts` in `src/worker/handlers/maintenance.ts` | 7 Tage | entspricht |
| A02 | Token E-Mail-Bestätigung / Adresswechsel | gültig 24 h; Zeile gelöscht 1 Tag nach Ablauf | alle 30 min | `TTL` in `src/server/modules/account/tokens.ts`; `expired-sessions-and-tokens` in `maintenance.ts` | Token ≤ 24 h | entspricht |
| A03 | Token Passwort zurücksetzen | gültig 30 min; Zeile gelöscht 1 Tag nach Ablauf | alle 30 min | wie A02 | – (ACC04: 30 min) | entspricht |
| A04 | Sitzungen | absolut 12 h, Leerlauf 60 min; Zeile gelöscht 1 Tag nach Ablauf oder Widerruf | alle 30 min | `SESSION_ABSOLUTE_MS`, `SESSION_IDLE_MS` in `src/server/auth/session.ts`; `maintenance.ts` | – (ACC03) | entspricht |
| A05 | Drosselungszähler (inkl. IP-Adresse bzw. E-Mail-Hash im Schlüssel) | 2 Tage ab Fensterbeginn | alle 30 min | `maintenance.ts` (`ops.rate_limit_counters`) | – | Frist nicht in PRD; IP im Klartext (siehe C04) |
| A06 | Konto und Profil bei Inaktivität | Vorwarnung nach 24 Kalendermonaten ohne Aktivität; Löschauftrag nach weiteren 30 Tagen ohne Aktivität | alle 6 h, je Lauf höchstens 200 Vorwarnungen bzw. 50 Löschungen | `RETENTION.inactivityMonths`, `inactivityGraceDays`, `inactivityDue` in `retention-rules.ts`; `notifyInactiveAccounts`, `eraseInactiveAccounts` in `src/server/modules/privacy/retention.ts`; Aufgabe `privacy-inactive-accounts` in `src/worker/handlers/privacy.ts` | 24 Monate + 30 Tage | entspricht; **Mitarbeitendenkonten mit aktiver Rolle ausgenommen** (Prüfung über PRI08) |
| A07 | Kontolöschung (auf Antrag oder A06) | Deaktivierung sofort; Teilschritte durch Worker; Arbeitsfrist 30 Tage | Outbox `erasure.account`; Eskalation nach 5 Fehlversuchen | `deactivateAccountForErasure`, `ACCOUNT_STEPS` in `src/server/modules/privacy/erasure.ts`; `REQUEST_DUE_DAYS` in `requests.ts`; `ESCALATE_AFTER` in `tasks.ts` | aktive Systeme ≤ 30 Tage | entspricht, sofern Worker läuft; 30 Tage sind Arbeitsfrist, kein erzwungener Ablauf |
| A08 | Einwilligungsnachweise | während Nutzung; 3 Jahre nach Deaktivierung gelöschter Konten | täglich | `RETENTION.consentProofYears` in `retention-rules.ts`; `purgeOldConsentProofs` in `retention.ts`; Aufgabe `privacy-consent-retention` | vorgeschlagen 3 Jahre | entspricht; rechtlich zu prüfen D01 |
| A09 | Gesundheitsdaten, eigene Löschung | sofort (eine Transaktion); Exportdateien durch Worker | Outbox `erasure.health` | `eraseHealthData`, `HEALTH_STEPS` in `erasure.ts` | sofort sperren, ≤ 30 Tage | entspricht |
| A10 | Gesundheitsdaten nach Widerruf | Löschung binnen 30 Tagen, ausgeführt ab Tag 28 | alle 6 h, je Lauf höchstens 100 Konten | `RETENTION.healthAfterWithdrawalDays`, `healthAfterWithdrawalRunFromDays` in `retention-rules.ts`; `eraseHealthAfterWithdrawal` in `retention.ts`; Aufgabe `privacy-health-withdrawal` | ≤ 30 Tage | entspricht; erneute Aktivierung vor Tag 28 verhindert Löschung |
| A11 | Gesundheitsdaten bei Kontolöschung | Teilschritt `database:health` | wie A07 | `ACCOUNT_STEPS` in `erasure.ts` | ≤ 30 Tage | entspricht |
| A12 | Beiträge und Antworten bei Kontolöschung | sofort ausgeblendet (`status = deleted`), dann entfernt; mit fremden Antworten als textloser Platzhalter | wie A07 | `database:community_texts` in `erasure.ts` | Text ausblenden, ≤ 30 Tage bereinigen | entspricht |
| A13 | Nachrichtentexte bei Kontolöschung | Text sofort entfernt (`body_encrypted = null`); unnötige Kontaktverknüpfungen entfernt | wie A07 | `deactivateAccountForErasure`, `database:messages` in `erasure.ts` | beide Ansichten, ≤ 30 Tage | entspricht |
| A14 | Kontaktanfragen | Verfall nach 14 Tagen; neue Anfrage frühestens nach 30 Tagen | alle 15 min | `expire-contact-requests` in `maintenance.ts` | – (MSG02) | entspricht |
| A15 | Moderationsfall, Einspruchsfrist | 30 Tage ab Entscheid; Abschluss automatisch nach 30 Tagen + 1 Tag ohne offenen Einspruch | stündlich | `APPEAL_WINDOW_MS` in `src/server/modules/moderation/cases.ts`; `moderation-auto-close` in `src/worker/handlers/moderation.ts` | – (Kapitel 10) | entspricht |
| A16 | Belege (`moderation.evidence_items`) und Meldungsdetails (`reports.details_encrypted`) | 180 Tage nach Fallabschluss | stündlich | `EVIDENCE_RETENTION_MS` in `cases.ts`; gesetzt in `case-actions.ts`, `appeal-actions.ts`, `moderation.ts`; Löschung `moderation-evidence-purge` | 180 Tage nach Fallabschluss | **nur teilweise**: übrige Falldaten ohne Frist (C05) |
| A17 | Exportdateien (Bucket `ms-medien`, Präfix `exports/`) | höchstens 24 h ab Bereitstellung | alle 10 min | `EXPORT_TTL_MS` in `src/server/modules/privacy/export-jobs.ts`; `expireExports`; Aufgabe `privacy-expire-exports` | ≤ 24 h | entspricht |
| A18 | Analysebezug und Rohereignisse | höchstens 30 Tage; sofort bei Widerruf, veralteter Einwilligungsfassung oder Kontolöschung | alle 10 min | `ANALYTICS_RETENTION_DAYS` in `src/lib/analytics.ts`; `analytics-retention` in `src/worker/handlers/analytics.ts`; `subjectRef` in `src/server/modules/analytics/track.ts` | 30 Tage | entspricht |
| A19 | Kohortenzähler (ohne Bezug) | 730 Tage | alle 10 min | `analytics-retention` in `analytics.ts` («vorläufige Aufbewahrung 24 Monate bis zur Freigabe D05») | danach nur Aggregate | Frist nicht in PRD → D05 |
| A20 | Audit-Ereignisse | 180 Tage | täglich, nur mit `app.retention_job` | `log-retention` in `maintenance.ts`; Trigger `ops.audit_append_only` in `drizzle/0001_rls_and_integrity.sql` | 180 Tage | entspricht; DSV-Protokollpflicht prüfen (C10) |
| A21 | Sicherheitsereignisse (verweigerte Zugriffe) | 180 Tage | täglich | `log-retention` in `maintenance.ts` | 180 Tage | entspricht |
| A22 | Outbox, erledigte Ereignisse | 14 Tage nach letzter Änderung | täglich | `log-retention` in `maintenance.ts` | – | Frist nicht in PRD; fehlgeschlagene/tote ohne Frist (C07) |
| A23 | Anfragezähler `ops.request_metrics` | 2 Tage | jede Minute | `worker-heartbeat` in `src/worker/handlers/ops.ts`; `drizzle/0007_request_metrics.sql` | – (NFR16) | entspricht Kommentar |
| A24 | Lebenszeichen `ops.worker_heartbeats` | 7 Tage | jede Minute | `worker-heartbeat` in `ops.ts` | – | keine Personendaten |
| A25 | Sonderzugriff | Gültigkeit höchstens 60 min, danach Status `expired` | alle 5 min | `SPECIAL_ACCESS_MAX_MINUTES` in `src/server/modules/admin/roles.ts`; `expire-grants` in `maintenance.ts` | ≤ 60 min (PRD 03) | entspricht; Datensatz selbst ohne Frist (C08) |
| A26 | Rollenbefristung | optionales Enddatum höchstens 2 Jahre; ohne Enddatum unbefristet bis Entzug | bei Vergabe | `src/server/modules/admin/role-actions.ts` | – (PRI08) | – |
| A27 | Begründete Ausnahme bei Datenschutzauftrag | höchstens 1 Jahr, danach erneute Prüfung | bei Erfassung | `src/server/modules/privacy/admin-actions.ts` | befristet, regelmässig prüfen (PRI06) | entspricht |
| A28 | Stündliche Datenbanksicherungen (Bucket `ms-backups`) | 35 Tage (Standard, über `BACKUP_RETENTION_DAYS` änderbar) | bei jedem Lauf | `RETENTION_DAYS` in `scripts/backup/format.ts`; `prune` in `scripts/backup/run.ts` | rollierend ≤ 35 Tage | entspricht; Obergrenze nicht erzwungen (C11) |
| A29 | Protokoll der Sicherungsläufe `ops.backup_runs` | 35 Tage | bei jedem Lauf | `recordBackupRun` in `scripts/backup/journal.ts`; `drizzle/0008_backup_runs.sql` | – | keine Personendaten |
| A30 | Railway-Volume-Backups | **nicht im Code**, Einstellung beim Anbieter | – | `docs/RUNBOOKS.md` R4 | ≤ 35 Tage | **offen D04**: Einstellung vornehmen und belegen |
| A31 | Plattformlogs (Railway) | **nicht im Code**, Einstellung beim Anbieter | – | `docs/traceability/konto-datenschutz.md` «Rohe Webserverlogs» | 14 Tage | **offen D04** |

## B Wiederherstellung und Sicherungsnachlauf

- Nach einem Lösch- oder Widerrufsauftrag können Daten in Sicherungen bis zu **65 Tage** bestehen
  (≤ 30 Tage aktive Bereinigung + 35 Tage Sicherung, PRD 11). Für A07 gilt das nur, wenn der Worker
  innerhalb der Arbeitsfrist abschliesst.
- Sicherungen werden nur in eine **neue** Datenbank wiederhergestellt; vor Wiederfreigabe wird das
  Löschjournal angewendet (`scripts/apply-deletion-journal.ts`, `docs/RUNBOOKS.md` R4). Das
  Journal (`privacy.deletion_journal`) erfasst Konto, Gesundheit und Exporte
  (`erasure.ts`).
- Wird `DATA_ENCRYPTION_KEY` rotiert, braucht ein Restore älterer Sicherungen den alten Schlüssel
  bis zum Ablauf der Sicherungsfrist (`docs/RUNBOOKS.md` R9, Schritt 7).

## C Daten ohne Löschregel im Code (Entscheid D05 nötig)

| ID | Daten | Tabelle / Ort | Personenbezug | Vorschlag zur Entscheidung (nicht freigegeben) |
|---|---|---|---|---|
| C01 | Kontaktformular: Anliegen und Antwortadresse (verschlüsselt) | `content.contact_messages` | ja, ggf. [bsP]; nicht an Konto gebunden, daher nicht von Kontolöschung erfasst | Frist ab Erledigung festlegen und Worker-Aufgabe ergänzen; in Datenschutzinformation nennen |
| C02 | Datenschutzaufträge inkl. Ausnahme-Freitext, Teilschritte | `privacy.requests`, `privacy.erasure_tasks` | ja (Konto-ID bleibt «als pseudonymisierter Verweis», Kommentar in `src/server/db/schema/privacy.ts`) | Nachweisfrist nach Abschluss festlegen (D01) |
| C03 | Löschjournal | `privacy.deletion_journal` | ja (Konto-ID) | Muss mindestens so lange bestehen wie die längste Sicherung (A28, A30); danach löschbar |
| C04 | IP-Adressen in Drosselungsschlüsseln | `ops.rate_limit_counters` | ja | Frist 2 Tage besteht (A05); Hashing wie bei `contact:` prüfen |
| C05 | Moderationsfälle, Meldungs-Metadaten, Massnahmen (inkl. `internal_note` im Klartext), Sanktionen, Einsprüche (inkl. `reason_encrypted`, `decision_note`) | `moderation.cases`, `reports`, `actions`, `sanctions`, `appeals` | ja, ggf. [bsP] | PRD 11 «Meldungen und Belege 180 Tage nach Fallabschluss» auf alle Falldaten ausdehnen oder begründete längere Frist (Wiederholungstäter) festlegen |
| C06 | In-App-Mitteilungen, Zustellaufträge | `messaging.notifications`, `messaging.delivery_jobs` | ja (Konto-IDs, keine Texte) | Frist z. B. nach Lesen/Zustellung festlegen |
| C07 | Fehlgeschlagene und tote Outbox-Ereignisse | `ops.outbox_events` (`status in ('failed','dead')`) | ja (IDs, verschlüsselte Empfängeradressen) | Frist nach Abschluss der Fehlerbehandlung |
| C08 | Sonderzugriffe, Rechteprüfungen | `ops.special_access_grants`, `ops.access_reviews` | ja (Mitarbeitende) | Nachweisfrist festlegen (Bezug zu Audit 180 Tage) |
| C09 | Technischer Restdatensatz gelöschter Konten | `identity.accounts` (`status = deleted`, E-Mail ersetzt, Passwort `!`) | pseudonym (Konto-ID, Zeitpunkte, Fassung der Bedingungen, Zielgruppenbestätigung) | Begründung «hält Antwortstrukturen zusammen» (`erasure.ts`) dokumentieren; Felder wie `audience_confirmed_at` ggf. leeren |
| C10 | Audit über 180 Tage hinaus | `ops.audit_events` | ja | Protokollpflicht nach DSV Art. 4 (ggf. ≥ 1 Jahr, getrennt aufzubewahren) – **zu prüfen D01**; Vorfallsschritte I01–I04 liegen im Audit und verschwinden nach 180 Tagen, daher Vorfallsdokumentation zusätzlich ausserhalb führen (`incidentprozess.md`) |
| C11 | Frist der stündlichen Sicherungen | Umgebungsvariable `BACKUP_RETENTION_DAYS` | – | Obergrenze 35 im Code erzwingen oder Änderung nur mit Ticket |
| C12 | Artikelversionen, Prüfvermerke, Verifikationsnachweise | `content.article_versions`, `editorial_reviews`, `verification_records` | Mitarbeitende | Nachweisfrist mit Redaktion festlegen (D08) |
| C13 | Exportaufträge (Metadaten ohne Datei) | `privacy.export_jobs` | ja | Bis Kontolöschung; ggf. kürzere Frist |
| C14 | Beiträge, Antworten, eigene Nachrichten aktiver Konten | `community.*`, `messaging.messages` | ja, ggf. [bsP] | PRD: «bis Löschung» – keine Altersfrist vorgesehen; Inaktivitätsregel A06 greift |

## D Prüfung und Nachweis

- Unit-Test der Fristfunktionen: `src/server/modules/privacy/retention-rules.test.ts`.
- Integrationstests Löschung/Export: `npm run test:db` (`tests/db/privacy.test.ts`), E2E F07
  (`e2e/f07-datenschutz.spec.ts`), Restore mit Journal: `npm run drill:restore`
  (`docs/traceability/konto-datenschutz.md` AT09).
- Vierteljährlich (Vorschlag): Stichprobe der Fristen auf der Produktionsdatenbank im Rahmen der
  Rechteprüfung (PRI08), Ergebnis als Anzahlen im Ticket. [Verantwortliche Rolle eintragen]
