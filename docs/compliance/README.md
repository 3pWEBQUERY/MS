# Datenschutz-Pflichtdokumente (Entwürfe)

> **Status: ENTWURF – nicht freigegeben.** Stand 3. November 2026, erstellt aus PRD und Codebasis
> (Branch `claude/laughing-bell-1whiqu`). Diese Dokumente sind keine Rechtsberatung und behaupten
> keine erteilte fachliche oder rechtliche Freigabe. Alle rechtlichen Einordnungen sind
> **zu prüfen durch Datenschutzberatung (D01)**.

PRI08 (`docs/prd/08-funktionale-anforderungen.md`) verlangt, dass Verzeichnis der
Bearbeitungstätigkeiten, Auftragsbearbeiterliste, Aufbewahrungsplan und Incidentprozess **vor dem
Pilot vorhanden und den verantwortlichen Rollen zugewiesen** sind. Kapitel 11
(`docs/prd/11-datenschutz-und-regulatorische-pruefung.md`) verlangt zusätzlich vor Pilotstart eine
DSFA als interne Freigabebedingung.

## Dokumente

| Datei | Inhalt | Rechtlicher Bezug (zu prüfen D01) | Verantwortliche Rolle |
|---|---|---|---|
| [verzeichnis-bearbeitungstaetigkeiten.md](verzeichnis-bearbeitungstaetigkeiten.md) | Zwölf Bearbeitungstätigkeiten mit Zweck, Betroffenen, Datenkategorien, Empfängern, Ausland, Aufbewahrung, Sicherheit | Art. 12 DSG \[Q1\] | Datenschutzkontaktstelle |
| [auftragsbearbeiter.md](auftragsbearbeiter.md) | Dienstleister, Daten, Orte, Grundlage der Auslandbekanntgabe, Vertragsstatus | Art. 9, 16, 17 DSG \[Q4\] | Technische Betriebsleitung mit Datenschutzkontaktstelle (D04) |
| [aufbewahrungsplan.md](aufbewahrungsplan.md) | Alle Fristen exakt aus dem Code mit Fundstelle, Abweichungen zur PRD, Daten ohne Frist | Art. 6 Abs. 4 DSG, PRD 11 (D05) | Datenschutzkontaktstelle mit Trägerschaft (D05) |
| [incidentprozess.md](incidentprozess.md) | Erkennen, Eindämmen, Bewerten, Melden, Wiederherstellen, Nachbereiten; Vorlagen | Art. 24 DSG \[Q3\] | Technische Betriebsleitung, Datenschutzkontaktstelle, Trägerschaft |
| [dsfa-entwurf.md](dsfa-entwurf.md) | Datenschutz-Folgenabschätzung: Beschreibung, Verhältnismässigkeit, Risiken, Massnahmen, Restrisiken | Art. 22, 23 DSG \[Q2\] | Datenschutzkontaktstelle mit Trägerschaft (D05) |

## Wer freigibt

Rollen gemäss `docs/prd/03-verantwortung-und-rechte.md` («Die Trägerschaft … benennt vor dem
Pilot einen Product Owner, eine Moderationsleitung, eine medizinische Redaktionsleitung, eine
technische Betriebsleitung und eine Datenschutzkontaktstelle») und dem Entscheidungsregister
`docs/prd/18-risiken-und-offene-entscheidungen.md`.

| Dokument | Erstellt / gepflegt von | Fachlich geprüft von | Freigegeben von | Entscheidung |
|---|---|---|---|---|
| Verzeichnis der Bearbeitungstätigkeiten | Datenschutzkontaktstelle [Person eintragen] | Technische Betriebsleitung [Person eintragen] | Trägerschaft [Organ eintragen] nach Prüfung Datenschutzberatung | D01 |
| Auftragsbearbeiterliste | Technische Betriebsleitung [Person eintragen] | Datenschutzkontaktstelle | Trägerschaft | D04 |
| Aufbewahrungsplan | Datenschutzkontaktstelle | Technische Betriebsleitung, Moderationsleitung (Falldaten) | Trägerschaft und Datenschutzberatung | D05 |
| Incidentprozess | Technische Betriebsleitung | Datenschutzkontaktstelle, Moderationsleitung, Krisenfachperson | Trägerschaft | D01, D03 |
| DSFA | Datenschutzkontaktstelle | Technik, Moderation, medizinische Redaktionsleitung | Trägerschaft und Datenschutzberatung (Konsultationsweg Art. 23 DSG festlegen) | D05 |

Freigabeprotokoll je Dokument (PRD 18 «Freigabeprotokoll»):

| Dokument | Name | Rolle | Entscheidung | Datum | Offene Auflagen | Frist |
|---|---|---|---|---|---|---|
| [Dokument] | [Name eintragen] | [Rolle] | [freigegeben / mit Auflagen / abgelehnt] | [TT.MM.JJJJ] | [Auflagen] | [Frist] |

## Pflege

- Jede Änderung an `src/server/db/schema/*.ts`, `src/server/modules/privacy/*`,
  `src/worker/handlers/*`, `scripts/backup/*` oder `.railway/railway.ts` prüft, ob Verzeichnis,
  Aufbewahrungsplan oder Auftragsbearbeiterliste nachgeführt werden müssen.
- Neue Dienstleister oder Unterauftragsbearbeiter werden **vor** Beauftragung in
  `auftragsbearbeiter.md` erfasst (PRD 11, R11).
- Die DSFA wird vor jedem Gate neu bewertet (PRD 18 «Restrisiken werden vor jedem Gate neu
  bewertet»).
- Diese Dateien unterliegen der Projektregel «höchstens 600 Zeilen» (`npm run check:lines`).

## Was vor dem Pilot fehlt

Organisatorisch (Trägerschaft):

1. **Verantwortliche Stelle** benennen: [Trägerschaft eintragen], Rechtsform, Adresse,
   Datenschutzkontaktstelle mit Erreichbarkeit (D01). Die Platzhalter `{{org.*}}` in
   `scripts/seed/content/legal.ts` sind noch offen; der Alarm `legal_placeholders`
   (`src/server/modules/admin/ops-alarms.ts`) meldet das ausserhalb des Demo-Modus.
2. **Zweck- und Rechtsgrundlagenmatrix** je Zweck (D01), Prüfung der Anwendbarkeit der DSGVO nach
   Art. 3 \[Q5\].
3. **Rollen benennen**: Tabelle «Alarmempfänger, Vertretung und Kontaktdaten» in
   `docs/RUNBOOKS.md` ist leer.
4. **Fristen freigeben** (D05) – insbesondere die Daten ohne Frist im Code (siehe
   `aufbewahrungsplan.md`, Abschnitt «Daten ohne Löschregel»).
5. **E-Mail-Anbieter wählen** und vertraglich binden (D04); Versandprotokoll-Fristen erfassen.
6. **Vertrag mit Railway** (Auftragsbearbeitung, Unterauftragsbearbeiter, Fernzugriffe, Grundlage
   für USA-Bezug) prüfen und abschliessen (D04).
7. **Entscheid Hosting-Standort**: PRD-Vorgabe «primäre Datenhaltung einschliesslich Backups in
   der Schweiz» ist mit Region Amsterdam (`.railway/railway.ts`) **nicht erfüllt** (D04).
8. **DSFA abschliessen**, Restrisiken akzeptieren oder Konsultation des EDÖB festlegen (D05).
9. **Ticketsystem und Tresor** bestimmen, in denen Vorfälle und Schlüssel ausserhalb der
   Plattform dokumentiert bzw. verwahrt werden (`docs/RUNBOOKS.md` R4, R9).

Technisch (vor produktiven Daten, belegt im Code):

1. `SEED_DEMO: "true"` in `.railway/railway.ts` (Service `web`) auf `false` setzen; Demo-Modus
   (`DEMO_MODE`) für Produktion aus.
2. Web-Service mit nicht privilegierter Rolle `ms_app` verbinden (`docs/db-roles.sql`). In
   `.railway/railway.ts` referenziert `web` heute `db.env.DATABASE_URL` (Eigentümerrolle) – damit
   greift die Row-Level Security für Gesundheitsdaten nicht.
3. Hilfe-Dienst mit Rolle `ms_hilfe_ro` verbinden; `.railway/railway.ts` übergibt ihm heute die
   volle `DATABASE_URL`.
4. Getrennte Produktions- und Testumgebung (NFR18, `docs/traceability/inhalte-betrieb-nfr.md`).
5. Aufbewahrung der Railway-Plattformlogs (PRD: 14 Tage) und der Railway-Volume-Backups (≤ 35 Tage)
   beim Anbieter einstellen und belegen.
6. Restore-Übung mit Löschjournal auf der Zielumgebung durchführen und protokollieren (AT09, R4).

Eine Liste der konkreten Abweichungen zwischen Datenschutzinformation und Code steht in
`dsfa-entwurf.md`, Abschnitt «Abgleich Datenschutzinformation und Code».

## Stand der gefundenen Lücken (Nachtrag)

Beim Erstellen dieser Entwürfe wurden Abweichungen zwischen Datenschutzinformation und Code gefunden. Bereits im Code behoben (Commit nach diesen Entwürfen):

- IP-Adressen in Drosselungsschlüsseln nur noch als Prüfsumme (`clientKey` in `src/server/modules/account/auth-actions.ts`); die Datenschutzinformation nennt das.
- Löschbeleg «Auftragsbearbeiter (E-Mail-Versand)» behauptet keinen Vertrag mehr (`vendorReceipt` in `src/server/modules/privacy/tasks.ts`).
- E-Mail-Versand auf Port 587 erzwingt in Produktion TLS (`requireTLS`, `src/server/mailer.ts`).
- Kontaktformular: Frist 12 Monate (`RETENTION.contactMessageMonths`, Arbeiter `expired-sessions-and-tokens`).
- Moderation: nach 180 Tagen werden zusätzlich interne Notizen, Einspruchsbegründungen und Entscheidnotizen entfernt (`src/worker/handlers/moderation.ts`); die Datenschutzinformation beschreibt das verbleibende Fallprotokoll ohne Inhalte.
- «Anonyme Nutzungsstatistik» heisst jetzt «pseudonym»/«freiwillig» (Datenschutzinformation, Einführung S07, Export).

Weiterhin offen (nicht im Code lösbar oder Entscheidung nötig): Verbindung mit Rolle `ms_app`/`ms_hilfe_ro` statt Eigentümerrolle (Einrichtung in Railway), eigene Symptombezeichnungen im Klartext (Verschlüsselung würde Suche/Sortierung ändern – Entscheid D05), Fristen für `privacy.requests`, Löschjournal und Sonderzugriffe (D05), Standort Schweiz und Verträge (D04).
