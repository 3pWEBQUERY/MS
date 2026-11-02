# Designsystem

Ruhig, präzise, Schweizer Typografie. Gebaut für Menschen mit Fatigue, Seh- und motorischen Einschränkungen (PRD Kapitel 12, WCAG 2.2 AA).

## Unverhandelbare Regeln

1. **Keine Farbverläufe, keine Schatten.** Tiefe entsteht durch Flächenton (`bg` → `surface` → `sunk`) und 1px-Linien (`border-line`). `box-shadow` ist global deaktiviert. Keine `bg-gradient-*`, kein `blur`, kein `backdrop-blur`, kein `drop-shadow`.
2. **Konzentrische Radien.** Innerer Radius = äusserer Radius − Innenabstand.
   | Element | Radius |
   |---|---|
   | Grosse Flächen, Hero, Dialog | `rounded-[28px]` |
   | Karte / Panel (Innenabstand 20–24px) | `rounded-[20px]` |
   | Element in Karte mit 8px Abstand zum Rand | `rounded-[12px]` |
   | Hinweisbox (`Notice`), Tabelle | `rounded-[16px]` |
   | Steuerelemente: Radius = Höhe / 4 | 56px → 14, 48px → 12, 40px → 10, 32px → 8 |
   | Badge (28px) | `rounded-[8px]` |
   | Checkbox | `rounded-[6px]` |
   | Pillen nur für Punkte/Indikatoren | `rounded-full` |
   Keine anderen Radien verwenden (kein `rounded-lg`, `rounded-xl` etc. – immer die expliziten Pixelwerte oben).
3. **Touchflächen ≥ 44 × 44px** für primäre Aktionen (Buttons `md` = 48px). Kleine Links in Fliesstext sind ausgenommen.
4. **Eine Hauptaktion pro Arbeitsansicht.** Primär = `variant="primary"` (Tinte). `accent` (Orange) sparsam – nur für den einen wichtigsten Abschluss auf dunklen Flächen oder Markenmomente.
5. **Status nie nur über Farbe.** Immer Text oder Icon + Text.
6. **Keine unruhige Bewegung.** Nur Farbübergänge 150ms. Keine Einblend-Animationen von Inhalten, keine Endlos-Feeds, keine Countdowns, keine Konfetti. Three.js nur dekorativ über `src/components/three` (respektiert reduzierte Bewegung & einfache Ansicht automatisch).
7. **Keine erfundenen Inhalte** (keine Fake-Mitglieder, Testimonials, Zahlen, Partnerlogos).

## Farben (Tailwind-Klassen)

| Token | Verwendung |
|---|---|
| `bg-bg` | Seitenhintergrund |
| `bg-surface` | Karten, Formulare |
| `bg-sunk` | Vertiefte Flächen, Platzhalter, Segmentnav |
| `bg-raised` | Hover auf Karten |
| `text-ink` / `text-ink-2` / `text-ink-3` | Text primär / sekundär / tertiär (alle ≥ 4.5:1) |
| `border-line` / `border-line-2` | dekorative Linien / stärkere Linien |
| `border-field` | Formularfeld-Rand (≥ 3:1) |
| `bg-accent` `text-accent-ink` `bg-accent-soft` | MS-Orange |
| `text-verified` `bg-verified-soft` | **Nur** fachlich geprüftes Wissen (COM04: nie für Mitgliederbeiträge) |
| `success / warning / danger / info` + `-soft` | Status |

Dark Mode funktioniert automatisch über die Tokens (`data-theme="dark"`). Nie feste Hex-Farben verwenden.

## Typografie

Atkinson Hyperlegible Next (Sans) und Atkinson Hyperlegible Mono (Belegnummern, Zahlen in Tabellen).

- Seitentitel: `PageHeader` (h1, `text-3xl sm:text-[2.5rem]`, `font-[650]`, `tracking-[-0.025em]`)
- Abschnitt: `SectionHeader` (h2 `text-xl font-[650]`)
- Fliesstext `text-base` (17px), sekundär `text-ink-2`, Hilfetexte `text-sm text-ink-2`
- Eyebrow: `text-sm font-semibold uppercase tracking-[0.08em] text-ink-2`
- Zahlen: Klasse `tabular`
- Langtext (Artikel, Rechtstexte): `.prose-ms`

## Abstände & Layout

- 4px-Raster. Seitenabschnitte `gap-10`, Kartenlisten `gap-3`, Formularfelder `gap-6`.
- Mitgliederbereich: Inhalt max. 1120px (über `AppShell`). Formulare max. `max-w-2xl`.
- Mobil ab 320px ohne horizontales Scrollen (A02). Tabellen scrollen in ihrem eigenen Container.

## Komponenten (`src/components/ui`)

| Datei | Exporte |
|---|---|
| `button.tsx` | `Button`, `ButtonLink`, `IconButton`, `buttonClass(variant,size)` – Varianten `primary accent secondary ghost danger quiet-danger`, Grössen `sm md lg` |
| `form.tsx` (client) | `Field` (Label, Hinweis, Fehler via aria-describedby; Render-Prop), `Input`, `Textarea`, `Select`, `CountedTextarea` (Zeichenzähler + Entfernen), `Checkbox`, `RadioCards`, `ScalePicker` (Skala ohne Vorauswahl, «nicht erfasst»), `Switch`, `SubmitButton` (Pending), `FormMessage` (Live-Region für ActionState), `UnsavedChangesGuard`, `OperationId` (idempotente Vorgangskennung) |
| `primitives.tsx` | `Card` (tone surface/sunk/accent/verified/ink), `CardLink`, `Badge`, `Notice`, `PageHeader`, `SectionHeader`, `BackLink`, `EmptyState`, `Skeleton`, `PageSkeleton`, `KeyValue`, `Table`, `Monogram`, `SegmentNav`, `ExternalLink`, `Divider`, `PlainText` (Text ohne HTML, Links erkennbar) |
| `dialog.tsx` (client) | `Dialog` (native `<dialog>`, Fokusverwaltung) |
| `icon.tsx` | `Icon name=…` (lucide, siehe Liste in der Datei; bei Bedarf dort ergänzen) |

## Zustände (PRD 04 «Gemeinsame Zustände»)

- **Laden**: `PageSkeleton` / `Skeleton` als Suspense-Fallback – stabil, ohne Pulsieren.
- **Leer**: `EmptyState` erklärt den nächsten freiwilligen Schritt.
- **Fehler**: `FormMessage` mit verständlicher Ursache + erneut versuchen; Eingaben bleiben erhalten.
- **Erfolg**: erst nach Serverbestätigung, per Live-Region angekündigt.
- **Kein Zugriff**: `notFound()` – neutral, verrät keine Existenz.
- **Teilbetrieb**: Hinweis `Notice tone="warning"`, wenn ein Feature-Schalter aus ist.

## Sprache

de-CH, Du-Ansprache, Schweizer Schreibweise (**ss statt ß**: «Grösse», «schliessen», «gemäss»). Klare Verben auf Buttons («Speichern», «Beitrag veröffentlichen», «Kontakt beenden»). Keine medizinischen Bewertungen («Verschlechterung», «Schub erkannt» o. ä. sind verboten).
