# MS Plattform

Barrierearme Plattform für Erwachsene mit Multipler Sklerose in der Deutschschweiz – freiwillige Alltagsdokumentation, moderierter Austausch, fachlich geprüftes Wissen und Schweizer Hilfsangebote. Umsetzung des PRD «Variante C · Responsive Web App» (`docs/PRD.md`).

| | |
|---|---|
| Framework | Next.js 16.4 (App Router, Cache Components, Partial Prefetching), React 19.3, TypeScript |
| Styling | Tailwind CSS 4, eigenes Designsystem (`docs/DESIGN.md`) – ohne Verläufe und Schatten |
| Animation | Three.js (dekorativ, respektiert reduzierte Bewegung und einfache Ansicht) |
| Daten | Railway Postgres via Drizzle ORM, getrennte Schemas je Fachmodul, Row-Level Security für Gesundheitsdaten |
| Medien & Exporte | Railway Bucket (S3-kompatibel, privat), Exporte anwendungsseitig AES-256-GCM-verschlüsselt |
| Hintergrund | Eigener Worker-Service mit transaktionaler Outbox (`src/worker`) |

## Lokale Entwicklung

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

```bash
npm run worker
```

Demo-Konten (nur Testumgebungen, fiktiv): `mitglied.a@demo.ms-plattform.ch` usw., Mitarbeitende z. B. `moderation@demo.ms-plattform.ch`. Das Passwort und das TOTP-Geheimnis der Mitarbeitenden gibt `npm run db:seed` aus.

Ohne SMTP-Konfiguration schreibt der Worker Bestätigungs- und Reset-Links in die Konsole.

## Deployment auf Railway

Projekt «MS Plattform» (Region Amsterdam, europe-west4) mit vier Bausteinen:

| Baustein | Einstellung |
|---|---|
| **Postgres** | Railway Postgres 18 |
| **ms-medien** | Railway Storage Bucket (Region `ams`) für Medien und verschlüsselte Exporte |
| **web** | Build `npm run build`, Pre-Deploy `npm run db:migrate`, Start `npm run start`, Healthcheck `/api/v1/health`, `PORT=8080` |
| **worker** | Start `npm run worker` (kein Build), Restart immer |

Die Konfiguration ist in `.railway/railway.ts` beschrieben (Railway Infrastructure as Code; `railway.json` ist bei Railway veraltet und wird für neue Services nicht mehr gelesen). Änderungen lassen sich mit der Railway-CLI prüfen und anwenden: `railway config plan`, dann `railway config apply`.

Variablen (geteilte Umgebungsvariablen, in den Services per `${{shared.…}}` referenziert):

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `BUCKET`, `ENDPOINT`, `REGION`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` als Referenzen auf den Bucket
- `DATA_ENCRYPTION_KEY` – identisch für web und worker. **Vor dem Speichern echter Daten neu erzeugen** (`openssl rand -base64 32`); ein späterer Wechsel macht bestehende verschlüsselte Daten unlesbar.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (nur web), `APP_URL`, `DEMO_MODE`, `TZ=Europe/Zurich`
- Noch zu ergänzen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (vertraglich geprüfter Dienst). Ohne SMTP werden in Produktion keine Bestätigungsmails versendet.

Startbestand für die Testumgebung (nur fiktive Daten): `railway run npm run db:seed` im Service «web».

Für volle RLS-Wirkung: `docs/db-roles.sql` ausführen und den Web-Service mit der Rolle `ms_app` verbinden.

> PRD-Vorgabe «primäre Datenhaltung in der Schweiz» (Kapitel 11, D04): Railway bietet keine Schweizer Region. Vor produktiven Daten ist zu entscheiden, ob Amsterdam (EU) genügt oder ein Schweizer Anbieter nötig ist.

## Struktur

Siehe `docs/ENGINEERING.md`. Kurz:

- `src/app/(public)` öffentliche Seiten · `(auth)` Kontoeinstieg · `(app)` Mitgliederbereich · `verwaltung` Verwaltung mit MFA-Pflicht
- `src/server/modules/*` Fachlogik je Modul (Gesundheit, Community, Messaging, Inhalte, Moderation, Datenschutz, Admin)
- `src/server/db/schema/*` Datenmodell nach PRD Kapitel 9
- `src/worker` Outbox-Verarbeitung, Export, Löschung, Zustellung, Fristen

## Freigaben

Diese Implementierung ersetzt keine der im PRD verlangten Fachprüfungen (Recht D01, Medizin D02, Krisenprozess D03, Hosting D04, Aufbewahrung/DSFA D05). Beispielinhalte im Seed sind als Demo gekennzeichnet und vor Produktivbetrieb fachlich zu prüfen.
