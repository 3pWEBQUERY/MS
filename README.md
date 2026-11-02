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

1. **Postgres** hinzufügen (Railway Postgres).
2. **Bucket** hinzufügen (Railway Storage Bucket). Die Variablen `BUCKET`, `ENDPOINT`, `REGION`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` per Referenzvariablen an beide Services geben.
3. **Service «web»** aus diesem Repository: nutzt `railway.json` (Build `npm run build`, Pre-Deploy `npm run db:migrate`, Start `npm run start`, Healthcheck `/api/v1/health`). Öffentliche Domain generieren.
4. **Service «worker»** aus demselben Repository: in den Service-Einstellungen den Config-as-Code-Pfad auf `railway.worker.json` setzen (Start `npm run worker`).
5. Variablen für beide Services:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `DATA_ENCRYPTION_KEY` – `openssl rand -base64 32` (identisch in web und worker, sicher aufbewahren)
   - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` – `openssl rand -base64 32` (web)
   - `APP_URL=https://<deine-domain>`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (vertraglich geprüfter Dienst)
   - optional `DEMO_MODE=true` für Pilot-/Testumgebungen
6. Einmalig Startbestand für Testumgebungen: `railway run npm run db:seed` (nur fiktive Daten, nie in Produktion mit echten Personen).
7. Für volle RLS-Wirkung: `docs/db-roles.sql` ausführen und den Web-Service mit der Rolle `ms_app` verbinden.

> PRD-Vorgabe «primäre Datenhaltung in der Schweiz» (Kapitel 11, D04): Region von Postgres und Bucket sowie Zugriffsländer vor produktiven Daten prüfen.

## Struktur

Siehe `docs/ENGINEERING.md`. Kurz:

- `src/app/(public)` öffentliche Seiten · `(auth)` Kontoeinstieg · `(app)` Mitgliederbereich · `verwaltung` Verwaltung mit MFA-Pflicht
- `src/server/modules/*` Fachlogik je Modul (Gesundheit, Community, Messaging, Inhalte, Moderation, Datenschutz, Admin)
- `src/server/db/schema/*` Datenmodell nach PRD Kapitel 9
- `src/worker` Outbox-Verarbeitung, Export, Löschung, Zustellung, Fristen

## Freigaben

Diese Implementierung ersetzt keine der im PRD verlangten Fachprüfungen (Recht D01, Medizin D02, Krisenprozess D03, Hosting D04, Aufbewahrung/DSFA D05). Beispielinhalte im Seed sind als Demo gekennzeichnet und vor Produktivbetrieb fachlich zu prüfen.
