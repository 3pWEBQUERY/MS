# Designsystem

**Editorial Calm**: ruhig, präzise, mit einer eigenen Stimme – ein Schweizer Magazin trifft ein ruhiges Werkzeug. Gebaut für Menschen mit Fatigue, Seh- und motorischen Einschränkungen (PRD Kapitel 12, WCAG 2.2 AA).

## Haltung – was diese Oberfläche ausmacht

- **Typografie trägt das Design.** Grosse Display-Serif (Fraunces) für Titel, mit genau einem kursiven Akzentwort (`<em>`) in Glut. Fliesstext bleibt Atkinson Hyperlegible.
- **Raster statt Kästchen.** Inhalte stehen in Haarlinien-Listen (`IndexList`/`IndexRow`, `border-t border-line`), mit Mono-Ziffern «01». Karten nur dort, wo eine Fläche als Ganzes klickbar ist oder Formulare gruppiert.
- **Rhythmus über Flächen.** Papier (`bg`) als Grund, eine tiefe Fläche (`bg-deep`) als Bühne für den wichtigsten Moment einer Seite (höchstens eine pro Seite), `surface` für ruhige Gegenabschnitte.
- **Signatur:** das Three.js-Faserfeld (`FiberField`) – nur auf Einstiegsseiten, nie hinter Text, der gelesen werden muss.

### Kein «AI Slop» – verboten

Verläufe, Glas/Blur, Glow, Schatten, Emoji als Icons, generische Icon-in-Quadrat-Kacheln im Raster, zentrierte Hero-Texte mit drei Feature-Karten darunter, «✨»-Badges, Stockfotos, erfundene Zahlen/Testimonials, Pastell-Kartenwände, jede Überschrift gleich gross.

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
6. **Keine unruhige Bewegung.** Farbübergänge 150ms; einzige Bewegung im UI: Pfeile rücken beim Überfahren 3px nach (`.nudge` in einer `group`). Keine Einblend-Animationen von Inhalten, keine Endlos-Feeds, keine Countdowns, keine Konfetti. Three.js nur dekorativ über `src/components/three` (respektiert reduzierte Bewegung & einfache Ansicht automatisch).
7. **Keine erfundenen Inhalte** (keine Fake-Mitglieder, Testimonials, Zahlen, Partnerlogos).

## Farben (Tailwind-Klassen)

| Token | Verwendung |
|---|---|
| `bg-bg` | Seitenhintergrund (Papier `#f3f0e9`) |
| `bg-surface` | Karten, Formulare |
| `bg-sunk` | Vertiefte Flächen, Platzhalter, Segmentnav |
| `bg-raised` | Hover auf Karten |
| `text-ink` / `text-ink-2` / `text-ink-3` | Text primär / sekundär / tertiär (alle ≥ 4.5:1) |
| `border-line` / `border-line-2` | dekorative Linien / stärkere Linien |
| `border-field` | Formularfeld-Rand (≥ 3:1) |
| `bg-accent` `text-accent-ink` `bg-accent-soft` | Glut (MS-Orange). `accent-ink` für Akzentwörter, Ziffern, Icons |
| `bg-deep` `text-on-deep` `text-on-deep-2` `text-deep-accent` `border-deep-line` | Tiefe Fläche – bleibt in beiden Themen dunkel (Fuss, «Mein Moment», Bühnen). Darauf nie `ink`-Tokens verwenden |
| `text-verified` `bg-verified-soft` | **Nur** fachlich geprüftes Wissen (COM04: nie für Mitgliederbeiträge) |
| `success / warning / danger / info` + `-soft` | Status |

Dark Mode funktioniert automatisch über die Tokens (`data-theme="dark"`). Nie feste Hex-Farben verwenden.

## Typografie

Fraunces (Display-Serif, nur ≥ 24px), Atkinson Hyperlegible Next (Text, UI) und Atkinson Hyperlegible Mono (Eyebrows, Ziffern, Belegnummern).

| Klasse | Einsatz |
|---|---|
| `display-xl` | Hero einer Einstiegsseite (Startseite) |
| `display-lg` | Begrüssung «Heute», grosse Abschnittstitel auf Einstiegsseiten |
| `display-md` | Seitentitel (`PageHeader` setzt ihn automatisch), Bühnen-Titel |
| `display-sm` | Abschnittstitel (`SectionHeader` h2), Titel leerer Zustände |
| `font-display text-[1.5rem…2rem]` | Titel in Index-Zeilen/Spalten |

- **Akzentwort:** `<h1 className="display-md">Verständlich <em>erklärt.</em></h1>` – höchstens ein `<em>` pro Titel, kursiv in Glut.
- **Eyebrow:** `<p className="eyebrow"><span className="index">01</span> Thema</p>` (Mono, Versalien; Index optional).
- **Ziffern:** `font-mono text-sm text-accent-ink` für «01», `tabular` für Werte.
- Fliesstext `text-base` (17px), sekundär `text-ink-2`, Hilfetexte `text-sm text-ink-2`; Führungstext `text-lg`/`text-xl text-ink-2`.
- Links im Text: `link-quiet` (Unterstreichung wird beim Überfahren kräftig).
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
| `primitives.tsx` | `PageHeader` (`size="lg"`, `flush`), `EmptyState` (`variant="plain"`), `IndexList` + `IndexRow` (Haarlinien-Zeilen mit Ziffer und Pfeil – **erste Wahl für Listen von Links**), `Card` (tone surface/sunk/accent/verified/ink → `ink` = tiefe Fläche), `CardLink`, `Badge`, `Notice`, `PageHeader`, `SectionHeader`, `BackLink`, `EmptyState`, `Skeleton`, `PageSkeleton`, `KeyValue`, `Table`, `Monogram`, `SegmentNav`, `ExternalLink`, `Divider`, `PlainText` (Text ohne HTML, Links erkennbar) |
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

## Muster (Referenzen im Code)

| Muster | Referenz |
|---|---|
| Hero mit Faserfeld, nummerierte Einstiegsspalten, tiefe Bereichs-Liste, Definitions-Raster | `src/app/(public)/page.tsx` |
| Begrüssung in Display-Serif mit kursivem Namen, tiefe Bühne mit invertierter Auswahl, Schnellzugriff als Haarlinien-Leiste | `src/app/(app)/heute/` |
| Tagebuch-Raster (Datum als Serif-Ziffer) | `src/components/health/entry-list.tsx` |
| Unterstrich-Tabs | `SegmentNav` |
