# Incidentprozess Datenschutz und Datensicherheit (Entwurf)

> **ENTWURF – nicht freigegeben.** Stand 3. November 2026. Grundlage: PRD 10 «Sicherheitsvorfälle
> und Meldungen» (I01–I04), PRD 11, `docs/RUNBOOKS.md` (insbesondere R5), Alarmcodes aus
> `src/server/modules/admin/ops-alarms.ts` und `src/app/api/v1/health/worker/route.ts`.
> Melde- und Informationspflichten sind **zu prüfen durch Datenschutzberatung (D01)**; dieses
> Dokument ist keine Rechtsberatung.

Geltungsbereich: Verletzungen der Datensicherheit im Sinne von Art. 5 lit. h DSG – Verlust,
Löschung, Vernichtung, Veränderung oder Offenlegung bzw. Zugänglichmachung von Personendaten an
Unbefugte, ob versehentlich oder widerrechtlich \[Q1, Q3\]. **Nicht** Gegenstand: Krisen von
Mitgliedern (Kapitel 10 K01, Krisenprotokoll D03), fehlerhafte Inhalte (RUNBOOKS R8), reine
Verfügbarkeitsstörungen ohne Datenbezug (R1, R2, R6) – diese können aber in einen Vorfall
übergehen (z. B. Datenverlust bei R4).

## Rollen (vor Pilot zu benennen)

| Rolle | Aufgabe im Vorfall | Person | Vertretung | Erreichbarkeit |
|---|---|---|---|---|
| Vorfallleitung (technische Betriebsleitung) | Koordination, Eindämmung, Protokoll | [benennen] | [benennen] | [Kanal] |
| Sicherheit | Analyse, Belegsicherung, Schlüsselrotation | [benennen] | [benennen] | [Kanal] |
| Datenschutzkontaktstelle | Bewertung Risiko, Meldeentscheid vorbereiten, Betroffeneninformation | [benennen] | [benennen] | [Kanal] |
| Leitung Trägerschaft | Entscheid über Meldung und Information, Kommunikation | [benennen] | [benennen] | [Kanal] |
| Moderationsleitung | Bei Bezug zu Community, Chat, Meldungen; Hinweise an Moderation | [benennen] | [benennen] | [Kanal] |
| Datenschutzberatung (extern) | Rechtliche Einordnung (D01) | [eintragen] | – | [Kanal] |
| Kommunikation | Öffentliche Statusmeldung, Rückfragen | [benennen] | [benennen] | [Kanal] |

Die Tabelle entspricht «Alarmempfänger, Vertretung und Kontaktdaten» in `docs/RUNBOOKS.md`; beide
werden gemeinsam gepflegt. Personalunion ist möglich (PRD 03), die Freigaben bleiben dokumentiert.

## Ablauf im Überblick

| Phase | PRD | Ziel | Zeitvorgabe |
|---|---|---|---|
| 0 Vorbereiten | – | Rollen, Kanäle, Ticketsystem, Tresor, Übung | vor Pilot |
| 1 Erkennen | – | Hinweis aufnehmen, Vorfall eröffnen | sofort |
| 2 Eindämmen | I01 | Zugriffe stoppen, Geheimnisse widerrufen, Belege sichern | sofort; kritische Warnungen binnen 4 h bewerten, bei aktivem Missbrauch sofort (PRD 14 via RUNBOOKS «Grundsätze») |
| 3 Bewerten | I02 | Daten, Reichweite, Folgen, Risiko, Pflichten | so rasch als möglich, laufend aktualisieren |
| 4 Melden und Informieren | I03 | EDÖB bei voraussichtlich hohem Risiko; Betroffene bei Bedarf | EDÖB «so rasch als möglich» (Art. 24 Abs. 1 DSG) \[Q3\] |
| 5 Wiederherstellen | I04 | Ursache beheben, Tests, Wiederaufnahme freigeben | nach Freigabe |
| 6 Nachbereiten | I04 | Nachbesprechung, Massnahmen, Dokumentation | Nachbesprechung binnen 5 Betriebstagen |

Jeder Schritt I01–I04 wird in der Verwaltung unter `/verwaltung/betrieb#vorfall` mit
Ticketreferenz protokolliert (`recordIncidentStepAction` in
`src/server/modules/admin/flags-actions.ts`, Audit-Aktion `incident.I01` … `incident.I04`).
**Wichtig:** Das Audit wird nach 180 Tagen gelöscht (`log-retention` in
`src/worker/handlers/maintenance.ts`) und enthält nur Schritt und Ticket. Das vollständige
Vorfallprotokoll (Vorlage unten) wird deshalb **ausserhalb der Plattform** im Ticketsystem
[eintragen] geführt. Die Dokumentationspflicht nach Art. 15 Abs. 4 DSV (Aufbewahrung der
Dokumentation, nach unserem Verständnis mindestens zwei Jahre ab Meldung) ist **zu prüfen D01**.

## 0 Vorbereiten

- Rollen benennen (Tabelle oben), Kanäle testen.
- Ticketsystem festlegen; Tickets enthalten **keine Inhalte, Gesundheitswerte, E-Mail-Adressen
  oder Pseudonyme** – Korrelations-IDs und Konto-IDs genügen (RUNBOOKS «Grundsätze», NFR15).
- `BACKUP_ENCRYPTION_KEY` offline im Tresor (RUNBOOKS R4); Ablauf der Schlüsselrotation R9 geübt.
- Log-Alarme in Railway auf `[alarm]` für `web` und `worker`, Metrik-Warnung 5xx, externer
  Erreichbarkeitsprüfer (RUNBOOKS «Alarmierung»).
- Meldeweg des EDÖB (Online-Meldung gemäss \[Q3\]) und Kontaktdaten der Datenschutzberatung
  verifizieren und hier eintragen: [eintragen].
- Vertraglich sicherstellen, dass Auftragsbearbeiter (Railway, E-Mail-Anbieter) Verletzungen so
  rasch als möglich melden (Art. 24 Abs. 3 DSG, `auftragsbearbeiter.md`).
- Jährliche Übung (Vorschlag) anhand eines Szenarios aus R5, Ergebnis im Ticket.

## 1 Erkennen

Auslöser (RUNBOOKS R5 «Auslöser» und Alarmierung):

| Signal | Quelle im Code / Betrieb | Mögliche Datenschutzrelevanz |
|---|---|---|
| Auffällig viele verweigerte Zugriffe | `ops.security_events` via `recordDenied` (`src/server/audit.ts`); Anzeige «Verweigerte Zugriffe in den letzten 24 Stunden» in `/verwaltung/betrieb` | Fremdzugriffsversuch auf Gesundheits- oder Chatdaten |
| `privacy_request_failed` | `ops-alarms.ts` (Aufträge mit Status `failed`) | Löschung/Export unvollständig → Daten länger als zulässig vorhanden (R3) |
| `backup_failed`, `backup_stale` | `ops-alarms.ts`, `scripts/backup/run.ts` | Verfügbarkeit/Integrität, möglicher Datenverlust (R4) |
| `outbox_dead_letters`, `delivery_dead`, `queue_age`, `worker_inactive` | `ops-alarms.ts`, `src/app/api/v1/health/worker/route.ts` | Fristen (Löschung, Export-Ablauf, Widerruf) laufen nicht (R2, R3) |
| `http_5xx_rate` | `ops-alarms.ts` aus `ops.request_metrics` | in der Regel Verfügbarkeit; Logs auf Datenbezug prüfen |
| `legal_placeholders` | `ops-alarms.ts` | kein Vorfall, aber Informationspflicht unvollständig |
| `safety_verification_overdue` | `ops-alarms.ts` | kein Datenschutzvorfall (R7) |
| Meldung von aussen | Kontaktformular Kategorie «datenschutz», Postfach Datenschutzkontaktstelle, Mitglieder, Forschende | jede |
| Fund in Logs | Railway-Logs, z. B. Inhalte trotz `src/lib/log-safety.ts` | Offenlegung an Logempfänger |
| Verlorenes Gerät / Austritt mit Zugriff | Mitarbeitende | Zugang zu Verwaltung, Railway, Schlüsseln |
| Kompromittierter Schlüssel oder Token | `DATA_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY`, Bucket-Schlüssel, `SMTP_PASS`, DB-Passwort | Entschlüsselung, Datenabfluss |
| Meldung eines Auftragsbearbeiters | Railway, E-Mail-Anbieter | je nach Vorfall |

Erste Schritte: Ticket eröffnen, Vorfallleitung alarmieren, Uhrzeit des Bekanntwerdens festhalten
(massgeblich für «so rasch als möglich»), Vorfallprotokoll anlegen.

## 2 Eindämmen (I01)

Gemäss `docs/RUNBOOKS.md` R5 Schritt 1:

- Betroffene Funktion per Schalter abschalten (`/verwaltung/betrieb#schalter`: Chat,
  Community-Schreiben, Gesundheits-Schreiben, Registrierung). Schalter löschen keine Daten.
- Mitarbeitende: Rollen und Sitzungen entziehen. Mitglieder: Kontosperre oder Sitzungen widerrufen.
- Geheimnisse rotieren: Bucket-Schlüssel, `SMTP_PASS`, Datenbank-Passwort `ms_app`
  (`docs/db-roles.sql`), `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. `DATA_ENCRYPTION_KEY` **nur nach
  R9** (blosser Austausch macht Bestand unlesbar). Offene Exporte bei Kompromittierung sofort
  verwerfen (R9 Schritt 6).
- Belege sichern ohne Inhalte weiterzugeben: Audit-Kette prüfen (`/verwaltung/audit`,
  `src/server/modules/admin/audit-chain.ts`), `ops.security_events`, Railway-Logs exportieren.
  Belege mit Personendaten nur im Tresor/Ticketsystem mit eingeschränktem Zugriff ablegen.
- Datenbankzugriff für Analyse nur über Sonderzugriff (`/verwaltung/audit/sonderzugriff`: Ticket,
  Zweck, zweite Freigabe, ≤ 60 min).
- Unberechtigter Datenzugriff ist Stoppkriterium: Einladungen pausieren (PRD 17, Risiko R01).

## 3 Bewerten (I02)

Leitung, Sicherheit und Datenschutzkontakt bewerten (PRD 10 I02). Leitfragen:

1. **Welche Daten?** Gesundheitstagebuch (T02), Nachrichten (T04), Moderationsbelege (T05),
   Kontaktformular (T07), Exporte (T09) sind [bsP]. **Schon E-Mail-Adresse oder Pseudonym in
   Verbindung mit der Plattform offenbart die Mitgliedschaft und damit einen
   Gesundheitsbezug** (PRD 11, RUNBOOKS R5 Schritt 2).
2. **Verschlüsselt?** Freitexte sind AES-256-GCM-verschlüsselt (`src/server/crypto.ts`). Schutz
   entfällt, wenn `DATA_ENCRYPTION_KEY` (bzw. für Sicherungen `BACKUP_ENCRYPTION_KEY`) ebenfalls
   betroffen ist. Klartext in der Datenbank: E-Mail, Pseudonym, Skalenwerte, eigene
   Symptombezeichnungen, Community-Beiträge, interne Moderationsnotizen.
3. **Wie viele Konten, welcher Zeitraum?** Aus Audit, Sicherheitsereignissen und Logs nur als
   Anzahlen ermitteln.
4. **Wer hatte Zugriff?** Extern, Mitarbeitende, Auftragsbearbeiter, andere Mitglieder.
5. **Folgen für Betroffene:** Bekanntwerden der Erkrankung (Arbeitgeber, Versicherung, Umfeld),
   Belästigung, Erpressung, Identitätsmissbrauch, Verlust eigener Aufzeichnungen.
6. **Daten zurückholbar / Zugriff beendet?**

Risikoeinstufung (Arbeitsinstrument, rechtliche Einordnung zu prüfen D01):

| Einstufung | Kennzeichen (Beispiele) | Folge |
|---|---|---|
| Kein Risiko erkennbar | Verschlüsselte Daten ohne Schlüssel betroffen; Fehlzugriff technisch verweigert; Daten nachweislich nicht abgeflossen | Dokumentieren |
| Risiko | Wenige Konten, Daten ohne Gesundheitsbezug, Zugriff kurz und eingegrenzt | Dokumentieren, Information Betroffener prüfen |
| **Voraussichtlich hohes Risiko** | [bsP] im Klartext oder mit Schlüssel; Zuordnung E-Mail ↔ Mitgliedschaft; Nachrichten- oder Tagebuchinhalte; viele Konten; unbekannter Empfänger; Daten öffentlich | **Meldung an EDÖB so rasch als möglich**, Information Betroffener prüfen |

Ergebnis im Vorfallprotokoll mit Begründung festhalten; bei neuen Erkenntnissen neu bewerten.

## 4 Melden und Informieren (I03)

- **EDÖB:** Bei voraussichtlich hohem Risiko für die Persönlichkeit oder Grundrechte der
  Betroffenen Meldung **so rasch als möglich** (Art. 24 Abs. 1 DSG) \[Q3\]. Eine Meldung kann mit
  unvollständigen Angaben erfolgen und nachgeführt werden – zu prüfen D01. Eine pauschale
  72-Stunden-Regel gilt nach Schweizer Recht nicht (PRD 10).
- **Betroffene:** Information, wenn es zu ihrem Schutz erforderlich ist oder der EDÖB es verlangt
  (Art. 24 Abs. 4 DSG); Ausnahmen nach Art. 24 Abs. 5 DSG – zu prüfen D01. Kanal: bestätigte
  E-Mail-Adresse über den E-Mail-Anbieter (Vorlage unten); bei grossem Umfang zusätzlich
  öffentliche Mitteilung über Hilfe-Dienst `hilfe`.
- **DSGVO:** Falls nach Art. 3 DSGVO anwendbar (D01), gelten zusätzlich Art. 33 (Meldung an die
  zuständige Aufsichtsbehörde, grundsätzlich binnen 72 Stunden) und Art. 34 \[Q5\] – zu prüfen D01.
- **Auftragsbearbeiter:** Bei Vorfall beim Anbieter dessen Meldung einfordern und ins Protokoll
  aufnehmen.
- **Weitere Stellen:** Strafanzeige, Versicherung, Partner – Entscheid Trägerschaft [eintragen].
- Entscheid, Zeitpunkt und Begründung (auch für «keine Meldung») im Protokoll und als Schritt I03
  in der Verwaltung festhalten.

## 5 Wiederherstellen (I04)

Gemäss R5 Schritt 4: Ursache beheben, Fremdzugriffstests (AT03, `npm run test:db`) wiederholen,
Wiederaufnahme durch Vorfallleitung und Datenschutzkontakt freigeben, Schalter wieder einschalten.
Bei Datenverlust Restore nach R4 **mit Löschjournal** (`scripts/apply-deletion-journal.ts`), damit
gelöschte Konten nicht reaktiviert werden. Bei Schlüsselrotation R9 vollständig abschliessen.

## 6 Nachbereiten

- Nachbesprechung binnen 5 Betriebstagen (PRD 10 I04): Ablauf, Ursache, Wirksamkeit der
  Massnahmen, Fristen eingehalten?
- Massnahmen mit verantwortlicher Person und Termin; DSFA (`dsfa-entwurf.md`) und Risikoregister
  (PRD 18) aktualisieren.
- Protokoll abschliessen und gemäss Dokumentationspflicht aufbewahren (D01).

---

## Vorlage A: Vorfallprotokoll

```
Vorfall-Nr. / Ticket:          [INC-…]
Eröffnet am / durch:           [Datum, Uhrzeit] / [Rolle]
Bekannt geworden am:           [Datum, Uhrzeit]   Quelle: [Alarmcode / Meldung / Fund]
Vorfallleitung:                [Rolle, Person]

1 Beschreibung (ohne Inhalte, Gesundheitswerte, E-Mail-Adressen, Pseudonyme)
  Art der Verletzung:          [Vertraulichkeit / Integrität / Verfügbarkeit]
  Betroffene Systeme:          [web / worker / hilfe / backup / Postgres / ms-medien / ms-backups / E-Mail]
  Zeitraum:                    [von – bis]

2 Eindämmung (I01)             Schritt in /verwaltung/betrieb#vorfall protokolliert: [ja, Zeit]
  Massnahmen:                  [Schalter, Sitzungen, Rotation …]   Zeit: [ ]
  Gesicherte Belege:           [Art, Ablageort]

3 Bewertung (I02)              Schritt protokolliert: [ja, Zeit]
  Datenkategorien:             [ ]   [bsP] betroffen: [ja/nein]
  Verschlüsselt / Schlüssel betroffen: [ ]
  Anzahl Konten (ca.):         [ ]
  Empfänger / Zugreifende:     [ ]
  Folgen für Betroffene:       [ ]
  Einstufung:                  [kein Risiko / Risiko / voraussichtlich hohes Risiko]
  Begründung:                  [ ]

4 Meldung und Information (I03) Schritt protokolliert: [ja, Zeit]
  Meldung EDÖB:                [ja/nein]  Zeit: [ ]  Referenz: [ ]  Begründung: [ ]
  Information Betroffene:      [ja/nein]  Zeit: [ ]  Kanal: [ ]     Begründung: [ ]
  DSGVO-Behörde (falls anwendbar): [ ]
  Entschieden durch:           [Rolle, Person]

5 Wiederherstellung (I04)      Schritt protokolliert: [ja, Zeit]
  Ursache:                     [ ]
  Tests:                       [AT03 / Restore / Stichproben]
  Freigabe Wiederaufnahme:     [Rolle, Person, Zeit]

6 Nachbesprechung              Datum: [ ] (≤ 5 Betriebstage)
  Massnahmen:                  [Massnahme – verantwortlich – Termin]
  DSFA / Risikoregister aktualisiert: [ja/nein]
Abgeschlossen am / durch:      [ ]
```

## Vorlage B: Meldung an den EDÖB (Inhaltsgerüst)

Inhaltspunkte in Anlehnung an Art. 15 DSV – Vollständigkeit und aktuelles Meldeformular des EDÖB
**zu prüfen D01** \[Q3\].

```
Verantwortliche:               [Trägerschaft, Adresse]
Ansprechperson:                [Name, Funktion, Telefon, E-Mail]
Art der Verletzung:            [ ]
Zeitpunkt und Dauer:           [Beginn, Ende, Zeitpunkt der Entdeckung]
Betroffene Datenkategorien:    [ ]  inkl. besonders schützenswerter Personendaten: [ja/nein]
Ungefähre Anzahl Datensätze:   [ ]
Kategorien und ungefähre Anzahl betroffener Personen: [ ]
Folgen und Risiken für Betroffene: [ ]
Getroffene / geplante Massnahmen: [Eindämmung, Behebung, Minderung der Folgen]
Information der Betroffenen:   [erfolgt am / geplant / nicht vorgesehen, Begründung]
Beteiligte Auftragsbearbeiter: [ ]
Nachträge folgen:              [ja/nein]
```

## Vorlage C: Information an Betroffene (Textentwurf, neutral)

Absender und Betreff dürfen keine zusätzlichen Gesundheitsinformationen enthalten (wie
`src/server/mailer.ts`).

```
Betreff: Wichtige Information zur Sicherheit deines Kontos

Hallo

Am [Datum] haben wir festgestellt, dass [kurze, verständliche Beschreibung]. Betroffen sind
[Datenkategorien]. [Nicht betroffen sind …]

Was wir getan haben: [Massnahmen].
Was du tun kannst: [z. B. Passwort ändern, Zwei-Faktor-Anmeldung prüfen, auf verdächtige
Nachrichten achten].

Fragen beantwortet die Datenschutzkontaktstelle: [Kontakt]. Du kannst dich auch an den
Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden.

[Trägerschaft]
```
