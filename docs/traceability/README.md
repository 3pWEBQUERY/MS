# Rückverfolgbarkeit PRD → Umsetzung

Prüfung jeder Anforderungs-ID der PRD (`docs/PRD.md`, Kapitel in `docs/prd/`) gegen den Code, Stand 3. November 2026. Status ehrlich bewertet: **erfüllt** (im Code nachweisbar), **teilweise** (umgesetzt, aber ein Abnahmeteil braucht Betrieb, Test oder Fachprüfung), **offen** (braucht eine Entscheidung D01–D09 oder ist bewusst nicht im MVP).

| Bereich | Datei | erfüllt | teilweise | offen |
|---|---|---:|---:|---:|
| Konto, Zugang, Rollen, Datenschutz (ACC, PRI, Kap. 3, 11) | [konto-datenschutz.md](konto-datenschutz.md) | 74 | 7 | 3 |
| Heute, Mein MS, Barrierefreiheit (HOM, DIA, Kap. 4, 12) | [heute-gesundheit-barrierefreiheit.md](heute-gesundheit-barrierefreiheit.md) | 48 | 4 | 1 |
| Community, Kommunikation, Moderation (COM, MSG, SAF, Kap. 10) | [community-kommunikation-moderation.md](community-kommunikation-moderation.md) | 86 | 6 | 0 |
| Inhalte, Betrieb, NFR, Architektur, Analytics (CON, NFR, Kap. 13–15) | [inhalte-betrieb-nfr.md](inhalte-betrieb-nfr.md) | 59 | 20 | 1 |

## Was «teilweise» und «offen» typischerweise bedeutet

- **Fachprüfungen und Entscheidungen** (D01 Recht, D02 Medizin/Skalen, D03 Moderation und Krise, D04 Hosting und Lieferanten, D05 Aufbewahrung/DSFA, D06 Pilot, D08 Redaktion): Code ist bereit, die Freigabe fehlt. Demo-Prüfungen im Seed sind als solche gekennzeichnet.
- **Nachweise, die nur im Betrieb entstehen:** volles Lastprofil auf der Zielumgebung (NFR04, NFR05; lokal gemessen in `docs/reports/leistung-2026-11.md`), Browserversionen (NFR02), Pentest (NFR12), Screenreader- und Betroffenentests (QA09, AT10), Krisenübung (QA07).
- **Hosting:** Schweizer Datenregion (Railway nur Amsterdam), RPO ≤ 1 h (NFR07, braucht PITR oder stündliche Sicherung), getrennte Produktions- und Testumgebung (NFR18).

## Prüfmittel im Repository

- `npm run typecheck`, `npm run lint`, `npm test` (Unit-Tests für Zeitlogik, Skalen, Fristen, Passwortregeln, Export-Format, Analytics-Allowlist, Log-Schwärzung, Einladungscodes, Anzeige-Cookie, Schlüsselrotation …)
- `npm run check:lines` – keine Datei über 600 Zeilen
- `.github/workflows/ci.yml` – Pipeline mit Typen, Lint, Tests, Zeilenregel, Audit und Build; Job `integration` mit Postgres-Service: `test:db`, `drill:worker`, `drill:restore`, `test:e2e`
- `npm run test:db` – DB-Integrationstests gegen frische Datenbank «ms_test» (AT02–AT09, RLS mit Rolle ohne BYPASSRLS, Trigger, Hash-Kette, Outbox)
- `npm run test:e2e` – Playwright gegen den Produktions-Build (Port 3200, Datenbank «ms_e2e»): F01–F07, AT10, axe WCAG 2.2 AA in sechs Modi, Tastatur
- `scripts/perf/` – Lasttest (`load.ts`), Chat-Latenz (`chat-latency.ts`), Mobil-Labortest (`web-vitals.ts`); Ergebnisse in `docs/reports/leistung-2026-11.md`
- `docs/RUNBOOKS.md` – Betriebsabläufe für Störungen (R1–R9, R9 Schlüsselrotation mit `scripts/rotate-data-key.ts`)
- `npm run drill:restore` – Restore-Übung mit Löschjournal auf Kopien (NFR08, AT09)
- `npm run drill:worker` – Wiederanlauf-Übung des Arbeiters (Absturz, Wiederaufnahme, geordnetes Herunterfahren, Backoff; NFR19)
- `npm run help:serve` – eigenständiger Hilfe-Dienst ohne Next.js (NFR20, Railway-Service `hilfe`)
- `.github/workflows/uptime.yml` – externer Verfügbarkeitsprüfer alle 5 Minuten (NFR06)
