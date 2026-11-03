# Engineering-Leitfaden

Stack: **Next.js 16.4 (App Router, Cache Components, Partial Prefetching)**, React 19.3, TypeScript strict, Tailwind CSS 4, Drizzle ORM + postgres.js (Railway Postgres), Railway Bucket (S3) für Medien und Exporte, Three.js für dekorative Animationen. Hintergrundarbeiter: `src/worker` (eigener Railway-Service).

> Next.js 16 weicht von älterem Wissen ab. Bei Unsicherheit die Doku in `node_modules/next/dist/docs/` lesen (z. B. `01-app/02-guides/authentication-with-cache-components.md`, `01-app/02-guides/forms.md`).

## Verzeichnisstruktur

```
src/app/(public)/…        öffentliche Seiten (PublicShell)
src/app/(auth)/…          Konto-Einstieg (Login, Registrierung, MFA, Reset, Re-Auth)
src/app/(app)/…           Mitgliederbereich (AppShell mit Seitenleiste/unterer Navigation)
src/app/verwaltung/…      Verwaltung (eigenes Layout, MFA-Pflicht)
src/app/api/v1/…          versionierte Route Handler (spätere native Apps, Downloads, SSE)
src/components/ui         Designsystem (siehe docs/DESIGN.md)
src/components/<modul>    modulbezogene Komponenten
src/server/db/schema/*    Drizzle-Schema, ein pg-Schema je Fachmodul
src/server/modules/<modul> Fachlogik (Services, Queries, Server Actions) – gemeinsame Logik für Web und spätere Apps
src/server/auth/*         Sitzung, Passwort, TOTP, Viewer/Guards (Data Access Layer)
src/worker/handlers/*     Outbox-Handler und periodische Aufgaben je Modul
src/static-help/*         eigenständiger Hilfe-Dienst ohne Next.js (NFR20, Railway-Service «hilfe»)
src/lib/*                 clientsichere Hilfen (Kataloge, Zeit, ActionState)
```

## Cache Components – Pflichtmuster für Seiten

Mit `cacheComponents: true` ist jeder Zugriff auf `cookies()`, `headers()`, `searchParams`, `params` oder ungecachte DB-Daten nur **innerhalb von `<Suspense>`** erlaubt, sonst bricht der Build ab. Deshalb hat jede dynamische Seite diese Form:

```tsx
export default function Page({ params, searchParams }: PageProps<"/community/beitrag/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/community/beitrag/[id]">["params"] }) {
  const viewer = await requireViewer();        // Auth IM Suspense-Bereich
  const { id } = await params;
  const post = await getPostForViewer(viewer, id);
  if (!post) notFound();                        // neutral, keine Existenzangabe
  return …;
}
```

- `PageProps<"/route">` und `LayoutProps<"/route">` sind global generierte Typen (nach `npm run typecheck` bzw. `next build`).
- **Kein** `export const dynamic`, **kein** `runtime`-Export, **kein** `unstable_noStore`.
- Rein öffentliche, selten geänderte Daten (Artikel, Angebote) dürfen in einer Funktion mit `"use cache"` + `cacheTag("articles")` + `cacheLife("hours")` gecacht werden; nach Änderungen `updateTag("articles")` in der Server Action. **Nie** `"use cache"` für personen- oder rechteabhängige Daten.
- Client-Komponenten mit `useSearchParams()` ebenfalls in `<Suspense>` setzen.
- `generateMetadata`, die `params` liest, ist ok; keine DB-Abfragen mit Personenbezug in Metadaten.

## Data Access Layer und Rechte (PRD 03, PRD 14)

- Seiten: `requireViewer(opts?)` aus `@/server/auth/viewer` (leitet um bei fehlender Sitzung, unbestätigter E-Mail, fehlendem Onboarding, Kontosperre). Optionen: `allowUnverified`, `allowNoProfile`, `allowSuspended`.
- Verwaltung: `requireStaff(["moderator", …])` (Rolle + MFA in dieser Sitzung, sonst `notFound()`).
- Server Actions: `actionViewer({ requireWrite?: true })` bzw. `actionStaff([...])` – werfen `AuthError`, das `runAction` in eine Meldung übersetzt.
- `viewer` enthält: `accountId, pseudonym, roles, isStaff, healthActive, healthDecided, writeSuspended, accountSuspended, verified, mfaEnabled, mfaVerified, prefs, reauthAt`.
- Sensible Aktionen (Export, Löschen, E-Mail/Passwort ändern): `requireRecentAuth(viewer, next)` auf der Seite und `hasRecentAuth(viewer)` in der Action → sonst Umleitung auf `/konto/bestaetigen?next=…`.
- **Jede** Abfrage filtert selbst nach Berechtigung (Eigentum, Gruppenmitgliedschaft, Kontaktstatus, Blockierung, Kontostatus). Versteckte Buttons sind keine Zugriffskontrolle. Unbekannte oder fremde IDs → `notFound()` bzw. neutrale Fehlermeldung, plus `recordDenied(kind, actorId, objectType)` aus `@/server/audit` bei Fremdzugriffsversuchen auf private Daten.
- Selektiere **nur benötigte Felder** (explizites `select({...})`), gib keine rohen DB-Zeilen an Client-Komponenten weiter. Nie `email` in Community-Abfragen.
- Gesundheitsdaten nur über `withOwnerScope(accountId, tx => …)` aus `@/server/db/scoped` (RLS-Kontext) **und** mit `eq(table.accountId, viewer.accountId)`.
- Blockierungen (`messaging.blocks`, aktiv = `lifted_at is null`, gilt beidseitig) in Feed, Suche, Profil, Kontaktanfrage, Nachricht und Mitteilungen berücksichtigen.

## Server Actions

Datei mit `"use server"` in `src/server/modules/<modul>/actions.ts` (oder `*-actions.ts`). Signatur für Formulare: `(prev: ActionState, formData: FormData) => Promise<ActionState>`.

```ts
export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { body: str(formData, "body"), topic: str(formData, "topic") };
  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("community_write");
    if (!(await consume(`post:${viewer.accountId}`, LIMITS.postsPerHour.limit, LIMITS.postsPerHour.window)))
      return fail("Du hast in der letzten Stunde bereits fünf Beiträge veröffentlicht. Bitte warte etwas.", { values });
    // validieren (zod), Rechte prüfen, schreiben (Transaktion), ggf. enqueue(...) in derselben Transaktion
    updateTag("feed"); // nur falls gecacht; sonst revalidatePath(...) oder redirect(...)
    return ok("Beitrag veröffentlicht.");
  }, values);
}
```

- `runAction` fängt `UserError` (fachliche Meldung, optional `fieldErrors`), `AuthError`, `FeatureDisabledError` und unbekannte Fehler (Korrelations-ID, keine Inhalte im Log). `redirect()`/`notFound()` werden durchgereicht.
- Bei Fehlern `values` zurückgeben, Formulare nutzen `defaultValue={state.values?.x}` – Eingaben gehen nicht verloren (HOM07). Keine sensiblen Daten in URL, `localStorage` oder Logs.
- Idempotenz: Formulare für Check-in, Tagebuch, Nachricht, Export enthalten `<OperationId />` (Feld `clientOpId`); der Server verwendet `onConflictDoNothing` auf `(accountId, clientOpId)` und liefert beim Wiederholen das bestehende Ergebnis. Fehlt die ID (kein JS), erzeugt der Server eine.
- Optimistische Versionierung: Updates mit `where(and(eq(t.id, id), eq(t.version, readVersion)))` und `version + 1`; 0 betroffene Zeilen → Konflikt (`UserError` mit `data: { conflict: true, current }`).
- Rate-Limits: `consume(key, limit, windowSeconds)` aus `@/server/rate-limit` mit `LIMITS`.
- Feature-Schalter: `assertEnabled("community_write" | "chat" | "health_write" | "registration")`.
- Audit für privilegierte Aktionen: `audit({ actorId, actorRole, action, objectType, objectId, ticket })` – **ohne** Freitext oder Gesundheitswerte.
- Outbox (Hintergrundaufgaben, Mitteilungen): `enqueue({ type, aggregateType, aggregateId, payload, dedupeKey }, tx)` in derselben Transaktion. Payload nur IDs.
- Optionale Nutzungsstatistik (PRD 15): `trackLater(accountId, event)` aus `@/server/modules/analytics/track` – nur die fünf Ereignisse aus `src/lib/analytics.ts`, ohne IDs, Texte oder Werte; gespeichert wird nur mit Einwilligung «analytics». Technische Fehler eines Kernablaufs: `runAction(fn, values, { flow: "F02" })`. Im Browser nur `sendAnalytics()` aus `@/components/analytics/beacon` (Server prüft erneut).
- Logs: nur Codes, IDs und Zähler; Fehlermeldungen von Bibliotheken über `redactLogText()` (`@/lib/log-safety`). `src/lib/log-safety.test.ts` prüft alle `console.*`-Aufrufe automatisch auf verbotene Felder (NFR15).
- Freitext immer mit `cleanText()` bereinigen; Ausgabe nur als Text (`PlainText`), nie `dangerouslySetInnerHTML`.
- Verschlüsselung von Freitexten (Tagebuchnotizen, Nachrichten, Belege, Meldungsdetails): `encrypt()` / `decrypt()` aus `@/server/crypto`.

## Datenbank

- Schema: `src/server/db/schema/*.ts`. Neue Spalten/Tabellen nur im eigenen Modul-Schema. **Nicht** `drizzle-kit generate` ausführen – Migrationen werden zentral erzeugt.
- Client: `import { db } from "@/server/db"`, Tabellen aus `@/server/db/schema`. Drizzle-Abfragen bevorzugen; `sql` Template für Spezialfälle (Volltext `to_tsvector('german', …) @@ websearch_to_tsquery('german', $q)`).
- Seiten mit Listen: Cursor-Paginierung, 20 Einträge Standard, höchstens 100; «Mehr laden» als Link mit `?cursor=` (kein Endlos-Scroll).

## Stolpersteine (geprüft)

- `getViewer()` ruft `connection()` auf – Sitzungsprüfungen laufen nie im Vorrendern. Eigene Zeitvergleiche (`new Date()`) in Seiten erst nach `requireViewer()`/`connection()`.
- `Date`-Objekte in rohen `sql\`…\``-Parametern werden vom DB-Client als ISO-Zeitpunkt gesendet (Korrektur in `src/server/db/index.ts`).
- Client-Komponenten mit `usePathname()` brauchen bei dynamischen Routen eine `<Suspense>`-Grenze (siehe `src/components/shell/nav-link.tsx`).
- Im Produktionsmodus ist `DATA_ENCRYPTION_KEY` Pflicht; ohne Schlüssel schlagen verschlüsselnde Aktionen bewusst fehl.

## Zeit

`src/lib/time.ts`: `localDateString`, `localTimeString`, `utcOffsetMinutes`, `zonedToUtc`, `formatDate`, `formatDateTime`, `formatRelative`, `inQuietHours`. Standardzeitzone `Europe/Zurich`, Zeitzone des Mitglieds in `viewer.prefs.timezone`.

## Qualitätsprüfung

- `npm run check:lines`: **keine Datei über 600 Zeilen.** Bei Bedarf nach Verantwortung aufteilen; Daten (Seeds) in mehrere Dateien.

- `npm run typecheck` (führt `next typegen` + `tsc` aus) und `npx eslint <dateien>` müssen sauber sein.
- **Nicht** `next build` oder `next dev` parallel zu anderen Agents starten.
- Barrierefreiheit: Labels, `aria-describedby` für Fehler (über `Field`), Überschriftenhierarchie (genau ein `h1` pro Seite über `PageHeader`), Landmarken, Fokus sichtbar, Tastaturbedienung, Tabellen mit `<th scope>`.
