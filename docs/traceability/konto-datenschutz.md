# Rückverfolgbarkeit: Konto, Zugang, Rollen und Datenschutz

Stand: 2026-11-03 · Grundlage: `docs/PRD.md` Kapitel 03, 04 (Zustände, Sitzungsregeln), 05 (S02–S17), 06, 07, 08 (ACC, PRI), 09, 11, 14, 16.
Status: **erfüllt** · **teilweise** (mit Begründung) · **offen – Entscheidung** (fachlich/rechtlich, D01–D09).

Abkürzungen: `auth-actions` = `src/server/modules/account/auth-actions.ts`, `viewer` = `src/server/auth/viewer.ts`,
`erasure` = `src/server/modules/privacy/erasure.ts`, `retention` = `src/server/modules/privacy/retention.ts`.

## Kapitel 03 Verantwortung und Rechte

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| R-Rollen | Rollen Gast … Datenschutzstelle mit Begrenzungen | `identity.staff_role` (`src/server/db/schema/identity.ts`); `requireStaff`/`actionStaff` in `viewer`; S58 nur `privacy_officer` (`src/app/verwaltung/datenschutz/**`) | erfüllt | Datenschutzstelle sieht nur Auftragsmetadaten, keine Inhalte. Rollen anderer Bereiche prüfen die jeweiligen Module. |
| R-Benennung | Trägerschaft benennt PO, Moderations-, Redaktionsleitung, Betrieb, Datenschutzkontakt | – | offen – D01/D03 | Organisatorisch, nicht im Code. |
| R-Standard | Standard verweigert; Server prüft jeden Zugriff | `getViewer` je Anfrage (React `cache` nur pro Request), `requireViewer`/`actionViewer`; Proxy nur optimistisch (`src/proxy.ts`) | erfüllt | Keine Rechte in `"use cache"`; geschützte Pfade `Cache-Control: private, no-store`. |
| R-Gesundheit | Gesundheitsdaten nur für Inhaber, getrennte Bereiche | `withOwnerScope` + Eigentümerfilter; RLS (`drizzle/0001_rls_and_integrity.sql`); Export `export-collect-health.ts` | erfüllt | Datenschutzstelle/Admin haben keinen Lesepfad. |
| R-E-Mail | E-Mail nie im Mitgliederprofil | `MemberProfileCard` (`src/components/account/profile-card.tsx`), Export Gegenseite nur Pseudonym | erfüllt | |
| R-Imitation | Keine stille Support-Imitation | – (keine Funktion vorhanden) | erfüllt | Bewusst nicht gebaut. |
| R-Rollenwechsel | Rollenänderungen mit MFA, protokolliert | `actionStaff` verlangt MFA-bestätigte Sitzung; Rollenaktionen in `src/server/modules/admin/role-actions.ts` (Verwaltungsbereich) | erfüllt | Rollen werden bei jeder Anfrage frisch gelesen – keine Berechtigungscaches. |
| R-Sperre | Gesperrte behalten Auskunft, Export, Löschung, Einspruch | `allowSuspended` in S12, S15, S16, S17, Export-Download, `rightsViewer` (`src/server/modules/privacy/actions.ts`), `src/app/(app)/konto/gesperrt/page.tsx` | erfüllt | |

## Kapitel 04 Gemeinsame Zustände und Sitzungsregeln

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| Z-Laden/Leer/Fehler/Erfolg | Stabile Platzhalter, Erfolg nach Serverbestätigung per Live-Region | `PageSkeleton`, `FormMessage`, `EmptyState` in allen Konto-/Datenschutzseiten | erfüllt | |
| Z-Offline | Offline bestätigt «noch nicht gespeichert», Eingaben bleiben | Alle Formulare des Bereichs nutzen `useHealthAction` (`src/components/health/use-health-action.ts`), inkl. `ActionButton` | erfüllt | Neu in diesem Audit: Login, Registrierung, Reset, Re-Auth, MFA, Profil, Einführung, Konto, Privatsphäre, Export, Löschen, S58-Formulare. |
| Z-Kein Zugriff | Neutraler Hinweis, sicherer Rückweg | `notFound()` + `recordDenied` (S17, Export-Download, S58) | erfüllt | |
| Z-Abmeldung | Nach Abmeldung geschützte Ansichten verwerfen | `logoutAction` löscht Cookie (invalidiert Router-Cache), `/api/v1/auth/expire` mit `Clear-Site-Data` | erfüllt | |
| Z-Ablauf | Abgelaufene Sitzung → erneute Anmeldung ohne Entwurfsspeicherung | `SessionWatch` (`src/components/shell/session-watch.tsx`) → `/api/v1/auth/expire` → S61 | erfüllt | Neu: Aktivität wird tabübergreifend geteilt (BroadcastChannel), ein ruhender Tab meldet nicht mehr ab, während in einem anderen gearbeitet wird. Abmelde-Route nur same-origin. |

## Kapitel 05 Screens S02–S17

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| S02 | Registrierung: E-Mail, Passwort, Erwachsenen-/Zielgruppenbestätigung, Bedingungen | `src/app/(auth)/registrieren/**`, `registerAction` | erfüllt | Kein Zweitkonto auf angemeldetem Gerät (Hinweis statt Formular). **Neu:** Bei eingeschaltetem Schalter `registration_invite_only` (begrenzte Einladung, PRD 17) zusätzlich Feld «Einladungscode» mit neutraler Fehlermeldung, Drosselung und atomarer Einlösung (`account/invitations.ts`). |
| S03 | Token prüfen, erneut senden, abgelaufen/verwendet | `src/app/(auth)/email-bestaetigen/**`, `verifyEmailAction`, `resendVerificationAction`, `inspectToken` | erfüllt | Bestätigung per Klick (Link-Vorschau verbraucht Token nicht). |
| S04 | Login, neutraler Fehler, Rückkehr zum Ziel | `src/app/(auth)/anmelden/**`, `loginAction`, `safeNext` | erfüllt | |
| S05 | Reset anfordern/neues Passwort, neutraler Versandstatus | `src/app/(auth)/passwort-vergessen/**`, `passwort-zuruecksetzen/**` | erfüllt | |
| S06 | Zweiten Faktor bestätigen, Recovery, Pflicht für Mitarbeitende | `src/app/(auth)/anmelden/mfa/**`, `mfaVerifyAction`, neu `requestMfaRecoveryAction` | erfüllt | Neu: geprüfte Wiederherstellung anfordern (siehe ACC05). |
| S07 | Pseudonym, freiwilliges Ziel, Datenschutz erklärt, überspringbar | `src/app/(app)/willkommen/**`, `completeOnboardingAction` | erfüllt | «Ohne Angaben weiter». **Neu:** letzter Schritt «Hilfst du mit einer anonymen Statistik?» – eigene, nicht vorausgewählte Entscheidung (PRI01, PRD 15), ohne Auswahl bleibt sie aus; Widerruf in S12. |
| S08 | Gesundheitsbereich gesondert aktivieren, ablehnen möglich | `src/app/(app)/mein-ms/aktivieren` (Modul Gesundheit), `recordHealthDecision` | erfüllt | Seite gehört zum Gesundheitsbereich; Nachweis über `consent_records`. |
| S09 | Eigenes Profil mit Vorschau der Mitgliedersicht | `src/app/(app)/profil/**`, `MemberProfileCard` | erfüllt | Vorschau folgt Eingaben sofort. |
| S10 | Sichtbares Mitgliederprofil | `src/app/(app)/community/mitglied/[id]` (Community-Modul) | erfüllt | Gleiche Felder wie S09 (Pseudonym, Interessen, Kanton). |
| S11 | E-Mail, Passwort, Sitzungen, Abmeldung | `src/app/(app)/konto/page.tsx`, `settings-actions.ts`, `settings.ts` | erfüllt | |
| S12 | Zwecke, Status, Version, Widerruf, Folgen | `src/app/(app)/konto/privatsphaere/**`, `consents.ts`, `privacy-actions.ts` | erfüllt | Verlauf mit Fassung, Zeit, Kanal. |
| S13 | Anzeige und Bedienung | `src/app/(public)/anzeige`, `src/app/(app)/konto/anzeige`, `saveDisplayPrefsAction` | erfüllt | Lokal für alle, synchronisiert für Mitglieder (HOM06). |
| S14 | Benachrichtigungen | `src/app/(app)/konto/mitteilungen` | erfüllt (MSG07) | Fachlich im Bereich Nachrichten geprüft. |
| S15 | Auskunft, Export, Gesundheitsdaten löschen, Konto löschen | `src/app/(app)/konto/daten/**` | erfüllt | |
| S16 | Löschbestätigung mit Folgen, Fristen, Re-Auth, Beleg | `src/app/(app)/konto/loeschen/**`, `src/app/(public)/konto-geloescht` | erfüllt | |
| S17 | Exportstatus, Ablaufzeit, sicherer Download | `src/app/(app)/konto/export/[id]/**`, `src/app/api/v1/exports/[id]/route.ts` | erfüllt | |
| Navigationsregel | Screenreader-bedienbar; kein unbemerktes Zweitkonto | `Field`/`FormMessage` (Labels, `aria-describedby`, Live-Regionen); `RegisterGate` | erfüllt | |
| Profilgrenze | Keine Diagnose-/Verlaufsfelder, keine Biografie/Bilder; Kanton als sichtbar bezeichnet | `communityProfiles` (nur Pseudonym, Interessen, Kanton), Hinweis «Der Kanton ist für Mitglieder sichtbar» | erfüllt | |

## Kapitel 06/07 User Stories und Flows

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| US01 | Start ohne Diagnosenachweis | ACC01–ACC06 | erfüllt | Nur Selbstbestätigung. |
| US09 | Nach Re-Auth nur eigene Daten als JSON + Tagebuch-CSV | `export-build.ts`, `export-jobs.ts`, Download-Route | erfüllt | Download prüft Sitzung, Eigentum, Re-Auth, Status und Ablauf bei jedem Abruf. |
| US10 | Ablehnen der Aktivierung lässt alles andere nutzbar | `healthActive`/`healthDecided` im Viewer; `write-guard.ts` | erfüllt | |
| US12 | Profilvorschau = Sicht anderer | `MemberProfileCard` | erfüllt | |
| US24 | Nach Re-Auth sofort deaktiviert, Löschung mit Beleg | `deleteAccountAction` → `deactivateAccountForErasure` → Worker `erasure.account` | erfüllt | |
| F01 | Registrierung bis erster Nutzen inkl. Abzweigungen | siehe ACC01–ACC06 | erfüllt | Neu: Doppelte E-Mail → gleiche Antwort, Hinweis-Mail an die Inhaberin mit Login-/Resetweg; nach Registrierung keine automatische Sitzung (Neu- und Doppelregistrierung von aussen nicht unterscheidbar). |
| F07 | Widerruf, Export, Löschen | S12, S15–S17, `erasure` | erfüllt | |

## Kapitel 08 Konto und Zugang

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| ACC01 | E-Mail, Passwort, Bestätigungen, versionierte Bedingungen; keine Geburtsdaten | `registerAction` (zod-Pflichtfelder), `consent_records` `terms`/`privacy_notice` mit Fassung | erfüllt | Texte fachlich freizugeben (D01). |
| ACC02 | Verifikation vor Schreibzugriff; Token 24 h einmalig; Resend ≤ 3/h je Adresse; Löschung nach 7 Tagen; keine Kontoaufzählung | `tokens.ts` (TTL, Hash, ältere Tokens ungültig), `requireViewer`/`actionViewer` (`unverified`), `resendVerificationAction`, Worker `unverified-accounts` (`src/worker/handlers/maintenance.ts`) | erfüllt | **Behoben:** Resend-Drosselung zählt jetzt vor der Kontosuche je Adresse – vorher verriet die Limit-Meldung die Existenz eines unbestätigten Kontos. **Behoben:** Reset über unbestätigtes Konto setzt Status auf `active` (vorher blieb `unverified` bei bestätigter Adresse hängen). |
| ACC03 | Rückkehr zum Ziel; 12 h absolut, 60 min Inaktivität mit Vorwarnung; serverseitiger Widerruf | `session.ts` (`SESSION_ABSOLUTE_MS`, `SESSION_IDLE_MS`), `getViewer` (gleitendes Fenster), `SessionWatch` (Warnung 5 min vorher), `destroyCurrentSession` | erfüllt | **Behoben:** tabübergreifende Aktivität; Login beendet eine noch vorhandene Sitzung desselben Geräts (keine Sitzungsfixierung). SSE-Kanal prüft die Sitzung in jedem Zyklus. |
| ACC04 | ≥ 15 Zeichen, ≥ 64 unterstützt, Einfügen; kompromittierte abweisen; Reset 30 min, einmalig, widerruft alle Sitzungen; neutrale Antwort; Drosselung | `src/server/auth/password-policy.ts` (neu, getestet), `requestResetAction`, `resetPasswordAction`, Login-Drosselung `LIMITS.loginFailures` | teilweise | **Behoben:** Prüfung erweitert (grössere Liste, Wiederholungen, Tastatur-/Zahlenfolgen, Grundwort + Ziffern). Ein Abgleich gegen eine vollständige Leak-Datenbank braucht einen externen Dienst → **D04** (Auftragsbearbeiter). |
| ACC05 | MFA für alle privilegierten Rollen, kontrollierte Wiederherstellung; Recovery einmalig; Verlust nur über geprüften Prozess | `requireStaff`/`actionStaff`, `mfa-actions.ts`, `recoveryCodes.usedAt`; neu `src/server/modules/privacy/mfa-recovery.ts`, `mfa-recovery-actions.ts`, S06-Anfrage, S58-Formular `mfa-recovery-form.tsx` | erfüllt | **Neu:** Anfrage nur nach Passwort-Anmeldung, sofortiger Hinweis an die Inhaberin, Identitätsprüfung als kontrollierter Code + Ticket, Vieraugenprinzip bei Mitarbeitendenkonten (zwei verschiedene Personen), keine Bearbeitung eigener Aufträge, Zurücksetzen widerruft alle Sitzungen. Recovery-Codes werden tolerant normalisiert (`recovery-code.ts`). Mitarbeitende ohne MFA werden aus der Verwaltung zu `/konto/sicherheit?mfa=pflicht` geleitet. **Neu:** Demo-Seed (`scripts/seed/core.ts`) enthält eine zweite fiktive Person der Datenschutzstelle (`datenschutz.vertretung@demo.ms-plattform.ch`), damit das Vieraugenprinzip demonstrierbar ist. |
| ACC06 | Pseudonym 2–40, änderbar; Interessen/Kanton optional; keine Fachrollen-Täuschung | `profile.ts` (`pseudonymProblem`, `impersonatesRole`), `profile-actions.ts` (optimistische Version) | erfüllt | |
| ACC07 | E-Mail/Passwort nur nach Re-Auth; neue Adresse vor Tausch bestätigt; Hinweis an alte Adresse; Sitzungen mit Gerätetyp/letzter Nutzung einzeln widerrufbar; Wirkung ≤ 60 s | `settings-actions.ts`, `verifyEmailAction` (`email.security_notice`), `listOwnSessions`, `revokeSessionAction` | erfüllt | Widerruf greift beim nächsten Zugriff sofort (`revoked_at` in `getViewer`). **Behoben:** wird die neue Adresse zwischenzeitlich vergeben, scheitert die Bestätigung verständlich statt mit Datenbankfehler. |
| ACC08 | Zustände unbestätigt … gelöscht; Sanktionen entziehen keine Datenschutzrechte; Rechteprüfung für Direktlinks, Schnittstellen, Hintergrundaufträge; Rollenwechsel protokolliert, Caches invalidiert | `accountStatus`-Enum, `viewer`, Export-Route, SSE-Route, Worker (`generateExport`, `email.ts`, `notifications.ts` prüfen Status erneut) | erfüllt | **Behoben:** Sicherheitshinweise gehen nicht mehr an Konten in `deletion_pending`. Rollen werden je Anfrage gelesen; es gibt keinen Berechtigungscache. |

## Kapitel 08 Datenschutz und Verwaltung

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| PRI01 | Datenschutzinformation vollständig; Gesundheit und Analytics getrennt, unvorausgewählt; Version, Zweck, Zeit, Kanal dokumentiert | `consent_records` (Zweck, Fassung, Entscheidung, Kanal, Zeit), S12, S08, Registrierungshinweis zu Gesundheitsrückschlüssen | teilweise | Technik erfüllt. **Neu:** Statistik-Einwilligung auch in S07 als eigene, unvorausgewählte Entscheidung (Zweck `analytics`, Fassung, Kanal, Zeit; «Nein» als `denied`), getrennt vom Gesundheitsbereich; die Datenschutzinformation hat einen Abschnitt zur optionalen Statistik. Offen: Platzhalter für Verantwortliche, Dienstleister und Länder → **D01/D04**; die Datenschutzinformation (Fassung `datenschutz-2026-11-v2`) nennt nun beide Wege, Einführung und S12. |
| PRI02 | Widerruf über S12 ohne Support, sofort; Löschung Gesundheitsdaten ≤ 30 Tage; Folgen vorher erklärt | `setHealthConsentAction`, `setAnalyticsConsentAction`, `write-guard.ts`, `retention.ts` `eraseHealthAfterWithdrawal` (ab Tag 28) | erfüllt | **Neu:** Analytics-Widerruf löscht den Analysebezug samt Rohereignissen sofort. Rechtliche Grundlage je Zweck → D01. |
| PRI03 | Export nach Re-Auth: Konto, Profil, Präferenzen, Einwilligungen, Gesundheit, Beiträge, Gesprächsdaten; Rechte Dritter; ≤ 24 h bereit; Download ≤ 24 h, jede Abrufberechtigung geprüft | `export-build.ts` + `export-collect-*.ts` (**neu** `export-collect-analytics.ts`), `export-jobs.ts`, Download-Route, `requestAccessAction`, **neu** `privacy/access-summary.ts` (S58 Auskunft) | erfüllt | **Neu:** Export enthält den Abschnitt `nutzungsstatistik` (eigener Analysebezug mit Löschdatum und Rohereignisse: Ereignis, Angaben, Kalendertag); bei Auskunftsanfragen zeigt S58 der Datenschutzstelle Einwilligungsstand, Analysebezug, Anzahl und Zeitraum der Rohereignisse sowie Zweck/Empfänger. **Aufgeteilt:** `export.ts` (753 Zeilen) in Sammelfunktionen je Bereich; Importpfad `@/server/modules/privacy/export` bleibt (Re-Export). Gegenseite nur mit Pseudonym; Meldungen gegen das Konto bleiben zum Schutz Meldender aussen vor. |
| PRI04 | Gesundheitsdaten-Löschung inkl. Exportdateien; sofort; aktive Systeme ≤ 30 Tage; separate bestätigte Auswahl; Konto bleibt | `eraseHealthData` (sofort in einer Transaktion), Worker `erasure.health` (Exportdateien), `src/app/(app)/konto/daten/gesundheit-loeschen/**` | erfüllt | Keine fremden Gesprächsdaten betroffen. |
| PRI05 | Konto sofort deaktiviert; Sitzungen, Freigaben, Auffindbarkeit, Vorschauen, Zustellungen entzogen; Texte aus beiden Ansichten; ≤ 30 Tage; Platzhalter; keine Reaktivierung durch Login; Beleg | `deactivateAccountForErasure`, `ACCOUNT_STEPS` in `erasure`, `getViewer`/`loginAction` (deletion_pending/deleted), `email.deletion_receipt` | erfüllt | **Ergänzt:** offene/laufende Sonderzugriffe enden mit dem Konto; Analysebezug wird im Teilschritt «Profil» entfernt. |
| PRI06 | Löschaufträge mit Identitätsstatus, Objektklassen, Fristen, Teilschritten, Belegen, Ausnahmen; Suchindex, Cache, Exporte, Auftragsbearbeiter; Wiederholung und Eskalation; Ausnahmen befristet | `privacy.requests`, `privacy.erasure_tasks`, `tasks.ts`, `runErasureRequest` (Eskalation nach 5 Versuchen), S58 (`retryErasureAction`, `setExceptionAction` ≤ 1 Jahr) | erfüllt | Ausnahme mit Prüftermin, Anzeige «Prüfung fällig». Suchindex/Cache sind abgeleitet bzw. nur öffentlich (dokumentierter Beleg). |
| PRI07 | Privilegierte Zugriffe manipulationsgeschützt protokolliert; kein Lesen privater Daten durch Admin; Audit ohne Freitext; Audit-Zugriff selbst protokolliert | `src/server/audit.ts` (Hash-Kette, Trigger append-only), S58 protokolliert Ansicht, Audit-Seiten der Verwaltung protokollieren Zugriffe | erfüllt | **Behoben:** Ticket bei Ausnahmen jetzt als Referenz validiert (vorher bis 60 Zeichen Freitext im Audit). Sonderzugriff selbst: Verwaltungsbereich. |
| PRI08 | Getrennte Berechtigungen für Rollen, Datenschutz, Konfiguration; Austritt entzieht sofort; Rechteprüfung quartalsweise; VVT, Auftragsbearbeiterliste, Aufbewahrungsplan, Incidentprozess | Rolle `privacy_officer` getrennt von `admin`/`ops`; Rollen je Anfrage frisch; `ops.access_reviews` (Verwaltung) | teilweise | Technik erfüllt; Demo-Seed mit zwei Personen der Datenschutzstelle (Vieraugenprinzip). VVT, Auftragsbearbeiterliste und Incidentprozess sind Dokumente der Trägerschaft → **D01/D04/D05**. |

## Kapitel 09 Datenmodell

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| Account | E-Mail, Hash, Verifikation, Zielgruppe, Status | `identity.accounts` | erfüllt | Neu: `inactivity_notice_at`. |
| Session/MFAFactor | Token-Hash, Ablauf, Gerätetyp; verschlüsseltes Geheimnis, Recovery-Hashes | `identity.sessions`, `identity.mfa_factors` (AES-GCM), `identity.recovery_codes` (SHA-256) | erfüllt | |
| RoleAssignment | Rolle, Geltungsbereich, Beginn, Ende, Freigabe | `identity.role_assignments` | erfüllt | |
| CommunityProfile | Pseudonym, Interessen, Kanton, Auffindbarkeit | `identity.community_profiles` | erfüllt | |
| UserPreference | Sprache, Zeitzone, Anzeige, Mitteilungen, Ruhezeit | `identity.user_preferences` | erfüllt | |
| ConsentRecord | Zweck, Fassung, Entscheidung, Zeit, Widerruf, Kanal; kein Boolean | `identity.consent_records` | erfüllt | |
| PrivacyRequest/ErasureTask | Typ, Identitätsprüfung, Frist, Ausnahme; System, Objektklasse, Status | `privacy.requests`, `privacy.erasure_tasks` | erfüllt | Neu: Typ `mfa_recovery`. |
| ExportJob | Inhaber, Umfang, Status, verschlüsselter Pfad, Ablauf | `privacy.export_jobs`, Bucket-Präfix `PREFIX.exports` | erfüllt | Kein öffentliches CDN. |
| AuditEvent | Akteur, Rolle, Aktion, Objekt, Ticket, Zeit, Ergebnis | `ops.audit_events` | erfüllt | |
| Löschung (Automat) | angefordert → deaktiviert → Teilschritte → geprüft → abgeschlossen; Fehler → Wiederholung/Eskalation | `deactivateAccountForErasure` (`deactivated`), `runErasureRequest` (`in_progress` → `verified` → `completed`, `failed`) | erfüllt | |

## Kapitel 11 Aufbewahrung (jede Zeile mit Löschregel)

| Datenklasse | Vorgabe | Löschregel im Code | Status | Bemerkung |
|---|---|---|---|---|
| Unbestätigte Konten | 7 Tage, Token ≤ 24 h | Worker `unverified-accounts` (`maintenance.ts`, `RETENTION.unverifiedDays`), `tokens.ts` TTL, `expired-sessions-and-tokens` | erfüllt | |
| Konto und Profil | 24 Monate Inaktivität, Vorwarnung, 30 Tage Frist | **Neu:** `retention.ts` `notifyInactiveAccounts` (Mail `inactivity_notice`) und `eraseInactiveAccounts` (→ regulärer Löschauftrag), Worker `privacy-inactive-accounts`; Aktivität = Anmeldung bzw. Nutzung (`lastActiveAt`) | erfüllt | Konten mit aktiver Mitarbeitendenrolle ausgenommen (quartalsweise Rechteprüfung PRI08). Fristen sind Vorschläge → D05. |
| Check-ins und Tagebuch | Bis Löschung/Widerruf; sofort sperren, ≤ 30 Tage | `eraseHealthData`, `eraseHealthAfterWithdrawal` | erfüllt | |
| Beiträge und Nachrichten | Text beidseitig ausblenden, ≤ 30 Tage bereinigen | Eigene Löschung leert Text sofort (Community/Nachrichten-Modul); Konto: `ACCOUNT_STEPS` | erfüllt | |
| Einwilligungsnachweise | 3 Jahre nach Ende | `purgeOldConsentProofs` (`RETENTION.consentProofYears`) | erfüllt | Rechtlich zu prüfen (D01/D05). |
| Meldungen und Belege | 180 Tage nach Fallabschluss | Worker `moderation-evidence-purge` (Moderationsmodul) | erfüllt | Ausnahmen im Moderationsmodul. |
| Sicherheits-/Auditlogs | 180 Tage | Worker `log-retention` | erfüllt | |
| Rohe Webserverlogs | 14 Tage | – (Plattform-Logs von Railway) | offen – D04 | Aufbewahrung beim Hoster einstellen und im Lieferantenverzeichnis belegen. |
| Analytics-Rohdaten | 30 Tage | Analytics-Modul (anderer Bereich); Widerruf löscht sofort (`setAnalyticsConsentAction`) | erfüllt (Einwilligung) | Rohdatenfrist prüft der Bereich Analytics. |
| Exporte | ≤ 24 h, verschlüsselt, authentifiziert | `expireExports`, `effectiveExport`, Download-Route | erfüllt | |
| Backups | ≤ 35 Tage; Löschjournal vor Wiederfreigabe | `scripts/apply-deletion-journal.ts` (Probelauf `--dry-run`, Ziel ≠ Quelle, stoppt alte Outbox-Aufträge); **neu** stündliche Dumps löschen sich nach 35 Tagen selbst (`BACKUP_RETENTION_DAYS`, `scripts/backup/run.ts`) | teilweise | Rotation der Railway-Volume-Backups beim Hoster auf ≤ 35 Tage einstellen (D04); Restore-Übung vor Pilot (AT09) durchführen und protokollieren. |
| Rechteprozess | Auskunft, Berichtigung, Export, Löschung; Identität verhältnismässig | S15, S58, `IDENTITY_METHODS` | erfüllt | Gesetzliche Fristenliste → D01. |

## Kapitel 14 Authentifizierung

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| T-Cookie | HttpOnly, SameSite, sicher | `createSession` (`__Host-`-Präfix in Produktion, `httpOnly`, `secure`, `sameSite: lax`) | erfüllt | |
| T-CSRF | Schreibzugriffe mit CSRF-Schutz | Server Actions (Origin-Prüfung von Next.js); `/api/v1/auth/expire` neu nur same-origin | erfüllt | |
| T-Token | Keine Zugangstoken in URL/Dauerspeicher | Sitzung nur im Cookie; E-Mail-Links mit Einmal-Token und `Referrer-Policy: no-referrer` | erfüllt | Einmal-Links per E-Mail sind üblich und laufen ab. |
| T-App | Späterer Tokenflow für native Apps | – | offen – D07 | Nicht im MVP. |

## Kapitel 16 Abnahme

| ID | Anforderung (kurz) | Umsetzung (Pfade) | Status | Nachweis/Bemerkung |
|---|---|---|---|---|
| AT03 | Fremde Tagebuch-/Export-ID: kein Inhalt, keine Existenz, Vorfall ohne Werte erfasst | Export-Status und -Download: Eigentümerfilter, neutrale 404, `recordDenied`; Gesundheitsabfragen mit RLS + Filter | erfüllt | Gilt auch für Admin (kein Lesepfad). |
| AT09 | Nach Löschung Sitzungen/Chat/Freigaben sofort ungültig; Restore wendet Journal an; Suchindex, Exporte, Jobs, Dienstleister geprüft | `deactivateAccountForErasure`, `ACCOUNT_TASKS`, `verifyAccountErased`, `scripts/apply-deletion-journal.ts`, **neu** `npm run drill:restore` | teilweise | Restore-Übung lokal bestanden: gelöschtes Konto bleibt nach Restore gelöscht (anonymisiert, ohne Passwort, ohne Gesundheitsdaten und Sitzungen), Gesundheitslöschung eines zweiten Kontos bleibt bestehen, übrige Daten unverändert, alte Hintergrundaufträge gestoppt. Dienstleister-Nachweis (E-Mail-Versand) bleibt organisatorisch (D04/D05). |
| QA01 | Verifikation, Reset, MFA, Sitzungsentzug, Rollenwechsel, Fremdzugriff | Unit-Tests: `src/server/auth/password-policy.test.ts`, `src/server/modules/account/recovery-code.test.ts`, `tests/core.test.ts` (TOTP, Passwort) | teilweise | Ende-zu-Ende-Tests mit Datenbank sind nicht Teil der Unit-Suite. |
| QA08 | Ablehnung, Widerruf, Auskunft, Löschung, Dienstleister, Backup | Unit-Tests: `src/server/modules/privacy/export-format.test.ts`, `retention-rules.test.ts` | teilweise | Wie QA01; Dienstleister-/Backup-Nachweis organisatorisch (D04). |

## Schema-Änderungen dieses Audits

- `identity.accounts.inactivity_notice_at timestamptz NULL` (Vorwarnung Inaktivität).
- Enum `privacy.request_type`: neuer Wert `mfa_recovery`.
