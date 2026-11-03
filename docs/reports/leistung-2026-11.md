# Leistungs- und Abnahmemessungen November 2026

Stand: 3. November 2026. Bezug: PRD Kapitel 13 (NFR03, NFR04, NFR05, NFR19, «Messprofil»), Kapitel 12 («Nachweis»), Kapitel 16 (QA09, QA10, AT01–AT10).

> **Messumgebung – bitte beachten.** Alle Werte stammen aus einer **lokalen Laborumgebung**, nicht aus Railway:
> eine VM mit 4 vCPU (Intel Xeon 2,3 GHz), 15 GB RAM, Node.js 22.23, PostgreSQL 16.15 lokal, **ein** `next start`-Prozess
> (Produktions-Build, Port 3200) mit Datenbank «ms_e2e» (migriert, Demo-Seed, fiktive Konten). Lastgenerator,
> SSE-Empfänger und Server laufen auf **derselben Maschine** – es gibt keinen Netzweg (entspricht der Vorgabe von
> NFR04 «ohne Netzweg», verfälscht aber die CPU-Verteilung zulasten des Servers). Die Dauer ist verkürzt
> (2,5–3 Minuten statt 15 + 60 + 15 Minuten). Die Ergebnisse sind ein **Nachweis der Messmethode und ein
> Richtwert**, kein Abnahmenachweis für die Produktion. Vor dem Pilot sind die Messungen mit dem vollen Profil
> gegen die Test-/Lastumgebung auf Railway zu wiederholen.

## Werkzeuge (ohne zusätzliche Pakete)

| Skript | Zweck |
|---|---|
| `scripts/perf/load.ts` | Lasttest nach Messprofil: 50 % Feed/Inhalt, 20 % persönliche Lesezugriffe, 20 % Chat, 10 % übrige Schreibvorgänge; p50/p95/max je Klasse und Vorgang, Fehlerquote, Datenkonsistenz (jede bestätigte Nachricht genau einmal, lückenlose Sequenz). Variablen `BASE_URL`, `SESSIONS`, `DURATION_S`, `RAMP_S`, `THINK_MS`, `STREAMS`, `OUT`. |
| `scripts/perf/chat-latency.ts` | NFR05: Zeit von «Senden» (Server Action) bis zum Eintreffen beim aktiven Empfänger über den SSE-Kanal. Variablen `PAIRS`, `MESSAGES`, `INTERVAL_MS`. Läuft parallel zum Lasttest. |
| `scripts/perf/web-vitals.ts` | NFR03: Mobil-Labortest mit Playwright, LCP, CLS und INP-Näherung (Event Timing einer typischen Interaktion), ≥ 5 Läufe je Kernscreen, Median und p75. |
| `scripts/perf/lib.ts` | Testkonten und Sitzungen direkt in der Testdatenbank, Server Actions per `fetch` (Action-ID aus dem Build-Manifest). |
| `npm run drill:worker` | NFR19: Kill-/Restart-Übung des Hintergrundarbeiters (`scripts/drills/worker-restart.ts`). |

Sitzungen entstehen direkt in der Datenbank (ohne Login-Formular), damit Argon2 nicht die Lesemessung dominiert. Seiten werden inklusive des vollständig gestreamten Inhalts (Suspense-Bereiche) gemessen.

## NFR04 Antwortzeit – Lasttest

Ziel: p95 Lesen ≤ 500 ms, Schreiben ≤ 800 ms unter Planlast (100 gleichzeitig aktive Sitzungen; Spitze 200).

| Lauf | Sitzungen | Denkpause (Mittel) | Dauer | Anfragen/s | Lesen p50 / p95 | Schreiben p50 / p95 | Fehler | Konsistenz |
|---|---:|---:|---:|---:|---|---|---:|---|
| Planlast | 100 (20 SSE) | 5 s | 180 s | 18 | 41 / **127 ms** | 25 / **86 ms** | 0 % | 348/348 Nachrichten, 0 Abweichungen |
| Spitze | 200 (40 SSE) | 5 s | 150 s | 38 | 98 / **404 ms** | 72 / **362 ms** | 0 % | 564/564, 0 Abweichungen |
| Überlast (Kapazitätsgrenze) | 100 (20 SSE) | 1 s | 120 s | 41 | 614 / 3 925 ms | 436 / 862 ms | 0 % | 526/526, 0 Abweichungen |

Mischung im Planlastlauf: Feed/Inhalt 49,3 %, persönlich lesen 20,3 %, Chat 20,4 %, übrige Schreibvorgänge 10,1 %.
Einzelvorgänge (Planlast, p95): Feed 133 ms, Artikel 131 ms, Hilfeangebot 126 ms, Gruppe 123 ms, «Heute» 148 ms,
«Mein MS» 130 ms, Verlauf 117 ms, Mitteilungen 141 ms, Gespräch lesen 127 ms, Nachricht senden 100 ms,
Fatigue-Eintrag 111 ms, Artikel merken 73 ms, gelesen markieren 60 ms.

**Bewertung.** Planlast und Spitze erfüllen die Ziele lokal deutlich. Der Überlastlauf (Denkpause 1 s, etwa das
Doppelte der Spitzenrate) zeigt die Kapazitätsgrenze eines einzelnen Node-Prozesses bei etwa **40 Seitenaufrufen/s**
auf dieser Maschine: Eine Seite kostet ohne Last rund 25–35 ms CPU-Zeit (React-Server-Rendering), danach entsteht
eine Warteschlange. Es gab dabei keine Fehler und keine Dateninkonsistenz. Für den Betrieb heisst das: mindestens zwei
Instanzen des Web-Service (Reserve und Ausfallsicherheit) und Messung der Railway-Instanzgrösse mit vollem Profil.

## NFR05 Chat-Latenz

Ziel: gespeicherte Nachricht beim aktiven Empfänger p95 binnen 3 s sichtbar.

| Bedingung | Nachrichten | erhalten | p50 | p95 | max |
|---|---:|---:|---:|---:|---:|
| während Planlast (100 Sitzungen) | 250 | 250 | 868 ms | **1 490 ms** | 1 611 ms |
| während Spitze (200 Sitzungen) | 250 | 250 | 978 ms | **1 710 ms** | 1 966 ms |
| während Überlast (Denkpause 1 s) | 200 | 200 | 1 477 ms | **2 227 ms** | 2 553 ms |

Der SSE-Kanal fragt die Datenbank alle 1,5 s ab; das bestimmt den Median (≈ halbes Intervall plus Verarbeitung).
Ziel in allen Läufen erfüllt, keine Nachricht verloren. Eine weitere Verkürzung wäre über `LISTEN/NOTIFY`
möglich (der Trigger `messaging.notify_message` existiert bereits), ist für das Ziel aber nicht nötig.

## NFR03 Webleistung – Mobil-Labortest

Profil: Pixel-5-Emulation (412 × 915 CSS-px, DPR 2,625), CPU-Drosselung × 4 (CDP), 4G-ähnliches Netz
(150 ms RTT, 1,6 Mbit/s ab, 750 kbit/s auf, «Slow 4G»), kalter Cache je Lauf, 5 Läufe je Screen.
Ziel am 75. Perzentil: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.

| Kernscreen | LCP Median / p75 | CLS Median / p75 | INP-Näherung Median / p75 |
|---|---|---|---|
| Start (S01) `/` | 868 / 892 ms | 0,001 / 0,001 | 32 / 32 ms |
| Artikel (S46) `/wissen/haeufige-symptome` | 864 / 872 ms | 0,001 / 0,001 | 40 / 48 ms |
| Heute (S18) `/heute` | 856 / 860 ms | 0 / 0 | 48 / 56 ms |
| Check-in (S20) `/mein-ms/check-in` | 876 / 880 ms | 0 / 0 | 32 / 32 ms |
| Community-Feed (S29) `/community` | 892 / 896 ms | 0 / 0 | 16 / 16 ms |

**Behobene Ursache im Code:** Im ersten Lauf lag die CLS auf Artikelseiten bei **0,25** (Ziel verfehlt). Ursache
war der späte Wechsel von der Ersatzschrift zu Atkinson Hyperlegible (`font-display: swap`), der Titel und Absätze
neu umbrechen liess (nachgewiesen: ohne Webfont CLS 0,001). `src/app/layout.tsx` lädt die Schriften jetzt mit
`display: "optional"` (vorgeladen; bei sehr langsamem Erstaufruf bleibt die metrisch angepasste Ersatzschrift, ab dem
nächsten Seitenaufruf gilt Atkinson aus dem Cache). Danach CLS ≤ 0,001 auf allen Screens.

INP ist eine Labornäherung (eine Interaktion je Screen: Menü öffnen, Skala wählen, Kachel öffnen); Felddaten werden
gemäss NFR03 nur zulässig und freiwillig erhoben und liegen nicht vor.

## NFR19 Kill-/Restart-Test des Arbeiters

`npm run drill:worker` gegen eine migrierte, geseedete Übungsdatenbank (lokal «ms_drill», 3. November 2026):
Deduplizierung (20 angelegt, 0 Duplikate übernommen), SIGKILL während der Verarbeitung, Wiederanlauf mit Übernahme
verwaister Ereignisse (20/20 erledigt, 7 erneut ausgeführt), geordnetes Herunterfahren mit SIGTERM (nichts bleibt in
«processing»), Rest nach Neustart 30/30, Backoff nach Fehler – alle Prüfungen bestanden. Läuft zusätzlich in der CI.

Ergänzende Beobachtung aus einem Vorversuch mit einem lokalen Test-SMTP-Server (60 Mails, Arbeiter während der
Zustellung mit SIGKILL beendet, Neustart): 60/60 Mails angekommen, **eine Mail doppelt** – genau die, deren
SMTP-Annahme vor dem Absturz, die Markierung «done» aber danach lag. Die Outbox arbeitet bewusst «mindestens einmal»;
für Transaktionsmails (Bestätigungslink, Sicherheitshinweis) ist eine seltene Doppelzustellung nach einem Absturz
vertretbarer als ein Verlust. Soziale Sammelmails schützt `notifications.ts` zusätzlich über die Markierung
«in Zustellung» (bei unklarem Ausgang keine erneute Mail).

## QA09 / A02 – automatisierte Barrierefreiheit und Reflow

`npm run test:e2e` (`e2e/a11y.spec.ts`): axe-core 4.14 mit den Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` über 58 Seiten (17 öffentliche, 27 Mitglieder-, 14 Verwaltungsseiten mit drei Rollen und MFA) in sechs
Modi: hell 1280 px, dunkel 1280 px, hell 320 px (Reflow, entspricht 400 % Zoom bei 1280 px), dunkel 640 px mit
Schrift 150 % (entspricht 200 % Zoom), hell 1920 × 1080 und dunkel 844 × 390 (Smartphone quer) – Screenmatrix NFR01. Zusätzlich: kein horizontales Scrollen der Seite, Tastaturtest (Skip-Link,
sichtbarer und nicht verdeckter Fokus, Anmeldung und Check-in vollständig per Tastatur). Ergebnis: **348 Seitenprüfungen
ohne Befund**, nachdem folgende Verstösse behoben wurden:

| Befund | Ursache | Behebung |
|---|---|---|
| `label-content-name-mismatch` (WCAG 2.5.3) auf allen Verwaltungsseiten | Markenlink mit abweichendem `aria-label` | Name aus sichtbarem Text plus `sr-only`-Ergänzung (`admin-shell.tsx`) |
| `label-content-name-mismatch` bei «Aus Auswahl entfernen» (S26) | `aria-label` enthielt den sichtbaren Text nicht am Anfang | `aria-label` beginnt mit dem sichtbaren Text (`action-forms.tsx`) |
| `scrollable-region-focusable` (WCAG 2.1.1) bei breiten Tabellen auf 320 px | Scroll-Container nicht per Tastatur erreichbar | `Table`: Region mit Namen, `tabIndex=0` (`primitives.tsx`) |
| Horizontales Scrollen 549 px im Verlauf, weitere Seiten 1–87 px | visuell verborgene Texte (`sr-only`, absolut positioniert) ragten aus nicht positionierten Scroll-Containern; `fieldset` mit `min-width: min-content`; lange Titel; Buttons ohne Umbruch; Kopfzeilen mit zu vielen Elementen bei 150 % | Scroll-Container `relative`; `fieldset { min-width: 0 }` (`globals.css`); Seitentitel `break-words hyphens-auto`; Buttons dürfen unter 640 px umbrechen (Mindesthöhe statt fester Höhe); Button-Reihen `sm:flex-wrap`; «Anmelden» im öffentlichen Kopf erst ab 768 px (sonst im Menü), «Zur Plattform» in der Verwaltung ebenso; Feldbeschriftungen `min-w-0 break-words`; Rasterlisten `grid-cols-1` |

Automatische Prüfungen finden erfahrungsgemäss nur einen Teil der Barrieren. Prüfungen mit VoiceOver, NVDA und
TalkBack sowie mit Betroffenen (PRD 12 «Nachweis und Beteiligung», D06) stehen weiterhin aus; eine
Konformitätsaussage erfolgt erst danach.

## Ende-zu-Ende- und Integrationstests

- `npm run test:e2e`: 29 Tests grün (F01–F07, AT10, Barrierefreiheit, Tastatur) gegen den Produktions-Build.
  Hinweis aus F04: Bei `notFound()` innerhalb einer Suspense-Grenze bleibt der HTTP-Status wegen Streaming 200; angezeigt
  wird die neutrale Seite «Diese Seite ist nicht verfügbar.» ohne Inhalte (geprüft).
- `npm run test:db`: 29 Integrationstests gegen eine frische Datenbank «ms_test» (AT02, AT03 inkl. RLS mit Rolle ohne
  BYPASSRLS, AT04–AT09, Konflikt bei veralteter Version, Ruhezeit, archivierte Gruppe, Audit-Hash-Kette, Belege
  unveränderlich, Outbox-Deduplizierung).
- CI-Job `integration` (`.github/workflows/ci.yml`) mit Postgres-16-Service: `test:db`, `drill:worker`,
  `drill:restore`, `test:e2e`.
