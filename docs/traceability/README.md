# Rückverfolgbarkeit PRD → Umsetzung

Prüfung jeder Anforderungs-ID der PRD (`docs/PRD.md`, Kapitel in `docs/prd/`) gegen den Code, Stand 3. November 2026. Status ehrlich bewertet: **erfüllt** (im Code nachweisbar), **teilweise** (umgesetzt, aber ein Abnahmeteil braucht Betrieb, Test oder Fachprüfung), **offen** (braucht eine Entscheidung D01–D09 oder ist bewusst nicht im MVP).

| Bereich | Datei | erfüllt | teilweise | offen |
|---|---|---:|---:|---:|
| Konto, Zugang, Rollen, Datenschutz (ACC, PRI, Kap. 3, 11) | [konto-datenschutz.md](konto-datenschutz.md) | 72 | 7 | 3 |
| Heute, Mein MS, Barrierefreiheit (HOM, DIA, Kap. 4, 12) | [heute-gesundheit-barrierefreiheit.md](heute-gesundheit-barrierefreiheit.md) | 44 | 5 | 2 |
| Community, Kommunikation, Moderation (COM, MSG, SAF, Kap. 10) | [community-kommunikation-moderation.md](community-kommunikation-moderation.md) | 83 | 9 | 2 |
| Inhalte, Betrieb, NFR, Architektur, Analytics (CON, NFR, Kap. 13–15) | [inhalte-betrieb-nfr.md](inhalte-betrieb-nfr.md) | 54 | 23 | 3 |

## Was «teilweise» und «offen» typischerweise bedeutet

- **Fachprüfungen und Entscheidungen** (D01 Recht, D02 Medizin/Skalen, D03 Moderation und Krise, D04 Hosting und Lieferanten, D05 Aufbewahrung/DSFA, D06 Pilot, D08 Redaktion): Code ist bereit, die Freigabe fehlt. Demo-Prüfungen im Seed sind als solche gekennzeichnet.
- **Nachweise, die nur im Betrieb entstehen:** Lasttest und Mobil-Labortest (NFR02–NFR05), Restore-Übung (NFR08, AT09), Pentest (NFR12), Screenreader- und Betroffenentests (QA09, AT10), Krisenübung (QA07).
- **Hosting:** Schweizer Datenregion (Railway nur Amsterdam), RPO ≤ 1 h (NFR07, braucht PITR oder stündliche Sicherung), getrennte Produktions- und Testumgebung (NFR18).

## Prüfmittel im Repository

- `npm run typecheck`, `npm run lint`, `npm test` (Unit-Tests für Zeitlogik, Skalen, Fristen, Passwortregeln, Export-Format, Analytics-Allowlist, Log-Schwärzung, Einladungscodes, Anzeige-Cookie, Schlüsselrotation …)
- `npm run check:lines` – keine Datei über 600 Zeilen
- `.github/workflows/ci.yml` – Pipeline mit Typen, Lint, Tests, Zeilenregel, Audit und Build
- `docs/RUNBOOKS.md` – Betriebsabläufe für Störungen (R1–R9, R9 Schlüsselrotation mit `scripts/rotate-data-key.ts`)
