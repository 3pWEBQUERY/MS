# Runbooks Betrieb (PRD 14 «Betriebsbereitschaft», NFR16–NFR20, PRD 17)

Diese Runbooks gelten für die Railway-Umgebung «MS Plattform» (Services `web`, `worker`, `Postgres`, Bucket `ms-medien`, Region Amsterdam) und diese Codebasis. Sie ersetzen weder den Krisenprozess (PRD 10, D03) noch die Rechtsprüfung von Meldepflichten (D01).

**Grundsätze in jedem Fall**

- Erst eindämmen, dann untersuchen. Schalter statt Hotfix, wenn ein Bereich gefährdet ist (`/verwaltung/betrieb#schalter`, HOM08). Bestehende Daten werden durch Schalter nie gelöscht.
- Öffentliche Hilfe bleibt erreichbar: `/sicherheit` rendert ohne Login und fällt bei Datenbankstörung auf die statische Liste in `src/server/modules/content/safety.ts` zurück (SAF06, NFR20, AT10).
- Keine Inhalte, Gesundheitswerte, E-Mail-Adressen oder Pseudonyme in Tickets, Chats oder Logs kopieren (NFR15). Für Support genügt die Korrelations-ID (`X-Request-Id` bzw. Meldung «Fehlercode …» in der Oberfläche, Logzeile `[action] <id>`).
- Jeder Schritt wird mit Ticket, Zeitpunkt und Person protokolliert: Vorfallschritte I01–I04 unter `/verwaltung/betrieb#vorfall` (Audit-Kette), Datenbankzugriff nur über Sonderzugriff `/verwaltung/audit/sonderzugriff` (Ticket, Zweck, zweite Freigabe, ≤ 60 min).
- Kritische Sicherheitswarnungen werden binnen vier Stunden bewertet; bei aktivem Missbrauch sofort eindämmen (PRD 14).

## Alarmierung und Zuständigkeit

| Signal | Quelle | Schwelle | Erste Reaktion |
|---|---|---|---|
| Web nicht bereit | Railway-Healthcheck und externer Prüfer auf `GET /api/v1/health` | 503 oder Timeout | Runbook «Vollständiger Wiederanlauf» |
| Fehlerquote | Logzeile `[alarm] code=http_5xx_rate` (Arbeiter, aus `ops.request_metrics`), ergänzend Railway-HTTP-Metriken | > 2 % 5xx über 5 Minuten ab 50 Anfragen (NFR16) | Logs `web` nach `[action]` filtern, Korrelations-IDs sammeln |
| Arbeiter / Warteschlange | externer Prüfer auf `GET /api/v1/health/worker`, Logzeilen `[alarm] code=…` | 503; `worker_inactive`, `queue_age` (> 15 min), `outbox_dead_letters`, `delivery_dead`, `privacy_request_failed`, `safety_verification_overdue` | jeweiliges Runbook unten |
| Backup | `[alarm] code=backup_stale` / `backup_failed` (Arbeiter, aus `ops.backup_runs`); Railway Volume-Backups ergänzend | letzte erfolgreiche stündliche Sicherung älter als 2 h oder letzter Lauf gescheitert | Runbook «Backupfehler» |
| Verweigerte Zugriffe | `/verwaltung/betrieb` («Verweigerte Zugriffe in den letzten 24 Stunden») | auffälliger Anstieg | Runbook «Datenabfluss» prüfen |

Einrichtung: In Railway für `web` und `worker` Log-Alarme auf `[alarm]` und für `web` eine Metrik-Warnung (5xx-Anteil) anlegen; den externen Uptime-Prüfer (NFR06, neutraler Anbieter) auf beide Health-Endpunkte und `https://hilfe-production.up.railway.app/health` im Minutentakt richten. Bis dahin prüft `.github/workflows/uptime.yml` alle 5 Minuten von GitHub aus; ein roter Lauf benachrichtigt die Beobachtenden des Repositorys. Adressen über die Repository-Variablen `MS_WEB_URL` und `MS_HILFE_URL` anpassen. Achtung: GitHub führt Zeitpläne nur auf dem Standard-Branch aus – bis zum Merge nur manuell («Run workflow»). `/api/v1/health/worker` **nicht** als Railway-Healthcheck des Web-Service verwenden – ein Arbeiterproblem darf kein Deployment blockieren.

**Alarmempfänger, Vertretung und Kontaktdaten** (PRD 14 verlangt konkrete Benennung – vor Pilot durch Trägerschaft festzulegen, D03/D07):

| Rolle | Person | Vertretung | Erreichbarkeit |
|---|---|---|---|
| Betrieb (Rufbereitschaft) | [vor Pilot benennen] | [vor Pilot benennen] | [Telefon/Kanal] |
| Sicherheit | [vor Pilot benennen] | [vor Pilot benennen] | [Telefon/Kanal] |
| Datenschutzkontakt | [vor Pilot benennen] | [vor Pilot benennen] | [Telefon/Kanal] |
| Moderationsleitung | [vor Pilot benennen] | [vor Pilot benennen] | [Telefon/Kanal] |
| Krisenfachperson (S49) | [vor Pilot benennen] | [vor Pilot benennen] | [Telefon/Kanal] |

Werkzeuge: Railway-Dashboard, Railway-CLI (`railway link`, `railway status`, `railway logs --service web|worker`, `railway redeploy --service …`, `railway variables --service …`, `railway connect Postgres`), Verwaltung `/verwaltung/betrieb` (Status, Schalter, Outbox, Zustellung), `/verwaltung/betrieb/einfuehrung` (Stoppkriterien).

---

## R1 Login-Ausfall

**Symptome**: Anmeldung schlägt für viele fehl, Schleife zurück auf `/anmelden`, MFA-Codes werden abgelehnt, E-Mail-Bestätigung kommt nicht an.

1. `GET /api/v1/health` prüfen. 503 → Datenbank: weiter mit R6.
2. Logs `web` der letzten 15 Minuten: `railway logs --service web` und nach `[action]` filtern. Fehlernamen notieren (nur Name/Code, keine Werte).
3. Typische Ursachen in dieser Codebasis:
   - **Server-Actions-Schlüssel**: Bei mehreren Instanzen muss `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` in allen Repliken identisch sein (sonst «Failed to find Server Action»). In `railway variables --service web` prüfen, nach Änderung `railway redeploy --service web`.
   - **Sitzungscookie**: In Produktion heisst es `__Host-ms_session` und braucht HTTPS ohne Domain-Attribut. `APP_URL` muss die öffentliche https-Adresse sein.
   - **Drosselung**: Fehlversuche je Adresse und Verbindung (`ops.rate_limit_counters`, Schlüssel `login-fail:` / `login-fail-ip:`; 10 bzw. 50 in 15 Minuten). Bei einem Angriff nicht zurücksetzen. Bei Fehlalarm (z. B. gemeinsamer Ausgang einer Institution) nach Sonderzugriff gezielt: `delete from ops.rate_limit_counters where key like 'login-fail-ip:%' and window_start > now() - interval '15 minutes';` – Ticket dokumentieren.
   - **TOTP abgelehnt**: Serverzeit prüfen (`TZ=Europe/Zurich`, Systemuhr). Mitarbeitende ohne Gerät: MFA-Wiederherstellung über die Datenschutzstelle (S58), nie per Datenbank-Update.
   - **Bestätigungs-/Reset-Mails fehlen**: `SMTP_*` gesetzt? Statuszeile «E-Mail-Versand» in S60. Outbox-Typen `email.verification` / `email.password_reset` in S60 prüfen → R2.
4. Bei Angriffsmuster (viele Adressen, wenige Verbindungen): Schalter «Registrierung» aus, Sicherheit informieren, R5 prüfen.
5. Nach Behebung: Test-Login mit Demo-Konto in der Testumgebung, Mitarbeitenden-Login mit MFA, Passwort-Reset bis Mail-Zustellung.

## R2 Verzögerte Nachrichten und Mitteilungen

**Symptome**: Chatnachrichten erscheinen beim Gegenüber erst nach Neuladen, E-Mail-Hinweise kommen spät, Alarm `queue_age` oder `delivery_dead`.

1. Chatnachrichten werden synchron gespeichert (`messaging`), die Live-Anzeige läuft über `GET /api/v1/conversations/{id}/stream` (SSE). Gespeicherte Nachrichten gehen bei Kanalabbruch nicht verloren; der Client lädt ab letzter Sequenz nach. Prüfen: 5xx oder Timeouts auf `/api/v1/conversations/` in den Railway-HTTP-Metriken.
2. S60 öffnen: Kennzahl «Wartende Ereignisse» und Queuealter. Arbeiterzeile «Hintergrundarbeiter» muss «Aktiv» zeigen (Lebenszeichen ≤ 5 Minuten).
3. Arbeiter inaktiv: `railway logs --service worker`. Startet er nicht (`[worker] Abbruch`), `railway redeploy --service worker`. Datenbank-Fehler (`Durchlauf fehlgeschlagen (…)`) → R6.
4. Zustellprobleme (Tabelle «Zustellaufträge mit Problemen»): Fehlercode prüfen (SMTP-Authentifizierung, Ratenlimit des Anbieters). Ursache beheben, dann «Erneut versuchen». Ruhezeiten (MSG07) verzögern Hinweise absichtlich – kein Fehler.
5. Fehlerwarteschlange (`outbox_dead_letters`): erst Ursache klären, dann «Alle erneut einreihen». Die Handler prüfen Rechte, Blockierungen und Kontaktstatus vor der Ausführung erneut (AT06) – erneutes Einreihen stellt nichts zu, was inzwischen gesperrt ist.
6. Dauert die Störung an: Schalter «Kontaktanfragen und Chat» aus (Hinweis an Mitglieder erscheint automatisch, US26). Community und öffentliche Hilfe bleiben verfügbar.

## R3 Fehlgeschlagene Exporte oder Löschungen

**Symptome**: Alarm `privacy_request_failed`, Datenschutzaufträge mit Status «fehlgeschlagen», Stoppsignal «Löschung funktioniert nicht» in `/verwaltung/betrieb/einfuehrung`.

1. S58 `/verwaltung/datenschutz` öffnen (Rolle Datenschutzstelle). Auftrag, Teilschritt (`privacy.erasure_tasks`) und Fehlercode ansehen. Fristen laufen weiter – Frist im Auftrag prüfen.
2. Outbox-Typen `export.generate`, `erasure.health`, `erasure.account` in S60: Status und Fehlercode. Häufige Ursachen:
   - Objektablage nicht erreichbar (Statuszeile «Objektablage») → Bucket-Variablen `BUCKET`, `ENDPOINT`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` am Service `worker` prüfen.
   - `DATA_ENCRYPTION_KEY` fehlt oder unterscheidet sich zwischen `web` und `worker` → Exporte/Entschlüsselung schlagen fehl. Schlüssel **nie** einfach neu erzeugen, solange verschlüsselte Daten bestehen; angleichen oder geordnet nach R9 rotieren.
3. Ursache beheben, dann Ereignis in S60 erneut einreihen. Löschungen sind idempotent; ein Fehler darf nie zum stillen Abschluss führen (PRD 09 Zustandsautomat Löschung).
4. Kontolöschung: Sitzungen, Chatschreiben und Freigaben sind bereits beim Antrag deaktiviert (AT09). Bleibt ein Teilschritt hängen, Auftrag eskalieren und betroffene Person über die Belegnummer informieren (Datenschutzstelle).
5. Nicht funktionierende Löschung ist ein Stoppkriterium (PRD 17): Schalter «Registrierung» aus, bis Retest bestanden.

## R4 Backupfehler

**Ziel**: RPO ≤ 1 Stunde (NFR07), RTO ≤ 4 Stunden (NFR08), quartalsweiser Restore-Test inkl. Löschjournal.

1. Railway → Postgres → Volume → Backups: letztes erfolgreiches Backup und Zeitplan prüfen. Railway bietet geplante Volume-Backups (täglich/wöchentlich/monatlich); **stündliche Sicherung oder kontinuierliche WAL-Archivierung ist damit nicht abgedeckt**. Deshalb läuft zusätzlich der Cron-Service **`backup`** (stündlich, `ops/backup/Dockerfile`, `scripts/backup/run.ts`): `pg_dump` → AES-256-GCM mit `BACKUP_ENCRYPTION_KEY` → eigener Bucket `ms-backups` (nicht öffentlich, getrennt von Medien) → Rücklese- und Tag-Prüfung → Löschung nach 35 Tagen. Fehlschlag: Lauf rot in Railway und Logzeile `[alarm] code=backup_failed`. `BACKUP_ENCRYPTION_KEY` **zusätzlich offline** verwahren (Tresor der Betriebsleitung) – ohne ihn sind die Sicherungen wertlos. Einschränkung: gleicher Anbieter und gleiche Region wie die Datenbank; ein Zweitstandort oder PITR bleibt Entscheidung D04/D07 (Risikoregister R11).
2. Backup fehlgeschlagen oder veraltet: manuelles Backup in Railway auslösen, Ursache (Volume voll, Wartung) klären, Betrieb und Datenschutzkontakt informieren.
3. Restore-Test (quartalsweise, nur in eine **neue** Datenbank). Vorübung ohne Produktionsdaten: `npm run drill:restore` gegen die Testdatenbank – spielt Sicherung, Löschung, Restore und Löschjournal automatisch durch und misst die Dauer je Schritt:
   1. Backup in neue Postgres-Instanz wiederherstellen – Volume-Backup in Railway **oder** stündlicher Dump:
      `npm run backup:restore -- --list`, dann `npm run backup:restore -- --latest --out db.dump` (mit `BACKUP_*`-Variablen des Services `backup`) und `pg_restore --no-owner --no-privileges --dbname "$ZIEL_URL" db.dump`. Lokal geprüft: Zeilenzahlen und Trigger identisch mit der Quelle.
   2. `npx tsx scripts/apply-deletion-journal.ts --target <restore-url> --dry-run`, dann ohne `--dry-run` (AT09, PRD 11). Optionale Analytics-Rohdaten gelöschter Konten verschwinden über die Fremdschlüssel-Kaskade; danach zusätzlich `delete from analytics.subjects where expires_at <= now();`.
   3. `npm run db:migrate` gegen die Restore-Datenbank (Migrationen sind vorwärtskompatibel).
   4. Stichproben: Login, Wissen, Tagebuch eines Demo-Kontos, Export. Dauer gegen RTO messen und im Ticket festhalten.

## R5 Datenabfluss oder unberechtigter Zugriff

**Auslöser**: Meldung von aussen, auffällige verweigerte Zugriffe, Fund im Log, verlorenes Gerät mit Mitarbeitendenzugang, kompromittierter Schlüssel.

1. **I01 Eindämmen** (sofort):
   - Betroffene Funktion per Schalter abschalten (Chat, Community-Schreiben, Gesundheits-Schreiben, Registrierung).
   - Mitarbeitende: Rollen und Sitzungen unter «Rollen und Audit» entziehen (Austritt). Mitglieder: Kontosperre in S54 oder Sitzungen widerrufen.
   - Kompromittierte Geheimnisse rotieren: Bucket-Schlüssel neu ausstellen, `SMTP_PASS`, Datenbank-Passwort (`ms_app`, siehe `docs/db-roles.sql`), `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (meldet alle Formulare einmal ab). `DATA_ENCRYPTION_KEY` nur nach R9 rotieren (Umverschlüsselung des Bestands – ein blosser Austausch macht bestehende Daten unlesbar).
   - Technische Belege sichern: Audit-Kette (`/verwaltung/audit`, Kette prüfen), `ops.security_events`, Railway-Logs exportieren – ohne Inhalte weiterzugeben.
2. **I02 Bewerten**: Welche Datenkategorien (Gesundheit? Nachrichten?), wie viele Konten, Zeitraum. Schon die Mitgliedschaft ist sensibel (PRD 11).
3. **I03 Informieren**: Entscheid über Meldung an den EDÖB und Information Betroffener durch Trägerschaft und Datenschutzkontakt (D01); Zeitpunkt und Begründung im Vorfallschritt festhalten.
4. **I04 Wiederherstellen**: Ursache beheben, Fremdzugriffstests (AT03) wiederholen, Wiederaufnahme freigeben, Nachbesprechung binnen 5 Betriebstagen. Unberechtigter Datenzugriff ist Stoppkriterium (PRD 17, R01): Einladungen bleiben bis zum Retest pausiert.

## R6 Vollständiger Wiederanlauf

**Ziel**: Kernbetrieb binnen 4 Stunden (NFR08). Reihenfolge: Datenbank → Web → Worker → Prüfung.

1. Status: `railway status`, Healthcheck `GET /api/v1/health`, Railway-Statusseite (Plattformstörung?).
2. **Datenbank**: Postgres-Service in Railway neu starten. Ist das Volume beschädigt → R4 (Restore in neue Instanz, Löschjournal anwenden, `DATABASE_URL` an `web` und `worker` auf die neue Instanz referenzieren).
3. **Web**: `railway redeploy --service web`. Pre-Deploy führt `npm run db:predeploy` aus (Migration; Demo-Seed nur bei `SEED_DEMO=true` – in Produktion `false`). Healthcheck muss 200 liefern.
4. **Worker**: `railway redeploy --service worker`. Innerhalb von 5 Minuten muss `/api/v1/health/worker` ein Lebenszeichen zeigen. Liegengebliebene Ereignisse in `processing` werden nach 5 Minuten automatisch wieder aufgenommen (dedupliziert, NFR19). Probe vor dem Pilot und nach Änderungen am Arbeiter: `npm run drill:worker` gegen die Testdatenbank (Absturz, Wiederanlauf, geordnetes Herunterfahren, Backoff; räumt selbst auf).
5. **Teilbetrieb**: Solange Teile fehlen, Schalter gezielt aus (HOM08). `/sicherheit`, `/hilfe` und `/wissen` bleiben öffentlich; `/sicherheit` zeigt notfalls die statische Notrufliste. Fällt `web` ganz aus, auf die Domain des Dienstes `hilfe` verweisen (Statusmeldung, Kontaktkanäle); er braucht weder Next.js noch Sitzungen.
6. **Prüfung**: Login mit MFA (Mitarbeitende), Wissen und Hilfe öffentlich, Check-in speichern (Testkonto), Chatnachricht zwischen Testkonten, Export anstossen. Erst dann Schalter wieder einschalten. Ergebnis im Ticket.

## R7 Krisenhilfeweg falsch oder nicht erreichbar

**Auslöser**: Hinweis über Kontaktformular, Moderation oder Prüfung: eine Nummer auf `/sicherheit` ist falsch, nicht erreichbar oder die Erreichbarkeitsangabe stimmt nicht. Falscher kritischer Hilfeweg ist ein Launch-Blocker und Stoppkriterium (R04, PRD 17).

1. Sofort `/verwaltung/verzeichnis/sicherheit` öffnen (Rolle Redaktion) und den betroffenen Hilfeweg **deaktivieren**. Der Sanitätsnotruf 144 bleibt als feste Schaltfläche auf der Seite, unabhängig von der gepflegten Liste.
2. Ist die gepflegte Liste insgesamt fraglich: alle Einträge deaktivieren – die Seite zeigt dann die statische Liste aus `src/lib/safety-static.ts` (nur offizielle Schweizer Nummern). Diese Liste ist ebenfalls fachlich zu prüfen; Änderungen dort brauchen ein Deployment.
3. Krisenfachperson informieren; korrigierte Angaben erfassen und **fachlich verifizieren** (Verfahren «Fachprüfung Krisenintervention» oder «Fachprüfung Medizin»). Erst dann wieder aktivieren – das System lässt die Aktivierung ohne fachliche Verifikation nicht zu.
4. Moderation informieren, damit sie in laufenden Fällen auf den korrigierten Weg verweist. Einladungen pausieren (Schalter «Registrierung»), bis die Korrektur geprüft ist.
5. Nachbereitung: monatliche Verifikation (SAF06) im Arbeitsvorrat; Alarm `safety_verification_overdue` beobachten.
6. Ist die Web-App selbst ausgefallen: Der Hilfe-Dienst (Railway-Service `hilfe`, `npm run help:serve`) liefert die Sicherheitsseite unabhängig aus (NFR20). Er lädt die gepflegte Liste alle 10 Minuten und behält bei einer Datenbankstörung die zuletzt geladene; ohne je geladene Liste zeigt er die statische. `GET /health` meldet `source: database|fallback`. Deaktivierte Einträge verschwinden dort spätestens nach 10 Minuten; sofort: `railway redeploy --service hilfe`.

## R8 Inhalt fehlerhaft (Artikel oder Angebot)

1. Artikel: `/verwaltung/redaktion/artikel/{id}` → «Zurückziehen» mit internem Grund (wirkt sofort, CON03). Korrektur als neue Version, erneute Fremdprüfung, dann Publikation (US25, AT08).
2. Angebot: `/verwaltung/verzeichnis/{id}` → «Ausblenden». Kontaktdaten verschwinden öffentlich; Alternativen werden angezeigt (F03).
3. Überfällige Prüftermine zieht der Worker automatisch zurück bzw. blendet aus (`content-withdraw-overdue-articles`, `content-expire-offers`, alle 15 Minuten).

## R9 Schlüsselrotation `DATA_ENCRYPTION_KEY` (NFR10)

**Anlass**: Verdacht auf Kompromittierung (R5, I01), Austritt einer Person mit Variablenzugriff oder planmässige Rotation (Empfehlung: jährlich). Der Schlüssel verschlüsselt Tagebuch- und Check-in-Notizen, Nachrichten, Meldungsdetails, Belege, Einsprüche, Kontaktformular-Anliegen, MFA-Geheimnisse, verschlüsselte Adressen/Links in der Outbox und die Exportdateien im Bucket. **Ein blosser Austausch macht diese Daten unlesbar** – der Bestand muss umverschlüsselt werden.

Werkzeuge: `src/server/crypto.ts` liest während der Rotation ersatzweise mit `OLD_DATA_ENCRYPTION_KEY` (schreibt immer mit dem neuen Schlüssel); `scripts/rotate-data-key.ts` verschlüsselt alle Spalten `*_encrypted` und die Outbox-Nutzlasten in Batches um. Das Skript ist idempotent (Werte, die sich mit dem neuen Schlüssel öffnen lassen, bleiben unverändert), bricht bei unbekannten verschlüsselten Spalten ab und protokolliert nur Zähler.

1. **Vorbereiten** (Ticket, Vieraugenprinzip, Sonderzugriff für den Datenbankzugang `/verwaltung/audit/sonderzugriff`): frisches Backup auslösen (R4). Neuen Schlüssel erzeugen: `openssl rand -base64 32` – nur im Passwortmanager der Trägerschaft und in Railway ablegen, nie im Ticket, Chat oder Repository.
2. **Doppelt lesbar ausrollen**: in Railway für **beide** Services `web` und `worker` gleichzeitig setzen: `OLD_DATA_ENCRYPTION_KEY` = bisheriger Wert, `DATA_ENCRYPTION_KEY` = neuer Wert (`railway variables --service web --set …`, ebenso `worker`), dann beide neu ausrollen. Ab jetzt entstehen neue Werte mit dem neuen Schlüssel; alte bleiben lesbar. Kurzprüfung: Login mit MFA (Mitarbeitende), eine bestehende Tagebuchnotiz und eine Nachricht im Testkonto öffnen.
3. **Probelauf** mit der Eigentümerrolle (nicht `ms_app` – RLS würde Gesundheitsdaten verbergen; das Skript prüft das): `railway connect Postgres` bzw. öffentliche URL der Datenbank, dann
   `OLD_DATA_ENCRYPTION_KEY=… DATA_ENCRYPTION_KEY=… DATABASE_URL=… npx tsx scripts/rotate-data-key.ts --dry-run`. Ausgabe je Tabelle: «umverschlüsselt / bereits neu / unlesbar».
4. **Umverschlüsseln**: denselben Befehl ohne `--dry-run` (Standard 500 Zeilen je Batch, `--batch=…` anpassbar). Abbruch ist unkritisch – einfach erneut starten. Belege (`moderation.evidence_items`) bleiben unveränderlich: Der Schutz-Trigger wird nur innerhalb der jeweiligen Batch-Transaktion ausgesetzt, Klartext und Hash bleiben gleich.
5. **Kontrolllauf**: erneut ausführen; erwartet «umverschlüsselt 0». «unlesbar > 0» (Exit-Code 2) heisst: Werte passen zu keinem der beiden Schlüssel (z. B. älterer Schlüssel aus einer früheren Rotation, Restore). Nicht löschen – Ursache mit Datenschutzkontakt klären, betroffene Tabelle im Ticket festhalten.
6. **Exportdateien im Bucket** werden **nicht** umverschlüsselt, sondern laufen ab: Sie sind höchstens 24 Stunden abrufbar und werden danach vom Worker gelöscht (`privacy.export_jobs`, Status «abgelaufen»). Bis dahin bleiben sie dank `OLD_DATA_ENCRYPTION_KEY` herunterladbar. Darum `OLD_DATA_ENCRYPTION_KEY` frühestens **24 Stunden nach Schritt 2** entfernen; vorher prüfen: `select count(*) from privacy.export_jobs where status = 'ready' and ready_at < '<Zeitpunkt Schritt 2>';` muss 0 sein. Bei Kompromittierung können offene Exporte stattdessen sofort verworfen werden (`update privacy.export_jobs set expires_at = now() where status = 'ready';` – der Worker löscht die Dateien binnen Minuten und markiert die Aufträge als abgelaufen; Betroffene fordern bei Bedarf neu an).
7. **Abschliessen**: `OLD_DATA_ENCRYPTION_KEY` an `web` und `worker` entfernen, beide neu ausrollen, Kurzprüfung aus Schritt 2 wiederholen. Den alten Schlüssel nach Ablauf der Backup-Aufbewahrung vernichten – ältere Backups brauchen ihn für einen Restore (R4: nach Restore Skript mit altem/neuem Schlüssel erneut ausführen). Ticket mit Zeitpunkten und Zählern schliessen, Vorfallschritt I04 protokollieren, falls Anlass R5 war.

## R10 Datenbankrollen und Row-Level Security

**Stand**: Web verbindet sich als `ms_app` (ohne BYPASSRLS), der Hilfe-Dienst als `ms_hilfe_ro`; Pre-Deploy `scripts/db-roles.ts` legt beide an und setzt die Rechte aus `docs/db-roles.sql` nach jeder Migration neu. Passwörter sind aus dem Postgres-Passwort abgeleitet – nach einer Passwortänderung von Postgres zuerst `web` neu deployen (führt die Rollen nach), dann `hilfe`.

1. Fehler wie `permission denied for table …` im Log von `web`: fehlendes Recht in `docs/db-roles.sql` ergänzen (nie BYPASSRLS vergeben), deployen.
2. Notfall-Rückfall (nur kurzzeitig, im Ticket begründen): Variable `APP_DB_ROLE` beim Dienst `web` entfernen → Web nutzt wieder die Eigentümerrolle; RLS ist dann nicht wirksam.
3. Prüfen: `select usename, count(*) from pg_stat_activity group by 1` – `ms_app` für Web, `ms_hilfe_ro` für den Hilfe-Dienst.
