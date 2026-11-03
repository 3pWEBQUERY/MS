import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsSubNav } from "@/components/admin/ops-nav";
import { AdminEmpty, AdminSectionBlock, StatGrid, StatTile } from "@/components/admin/ui";
import { Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { ANALYTICS_LABELS, ANALYTICS_MIN_PERSONS } from "@/lib/analytics";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { OPS_ROLES } from "@/server/modules/admin/ops";
import { ANALYTICS_DIMENSION, analyticsOverview, type AnalyticsOverview } from "@/server/modules/analytics/aggregates";

export const metadata: Metadata = { title: "Nutzungsstatistik" };

/**
 * S60 Teil Nutzungsstatistik (PRD 15): optionale Produktanalytics, nur aggregiert.
 * Jede Zelle erst ab zehn Personen; kleinere Gruppen werden als «unter 10» unterdrückt.
 */
export default function UsagePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content />
    </Suspense>
  );
}

const SMALL = `unter ${ANALYTICS_MIN_PERSONS}`;
const label = (v: string) => ANALYTICS_LABELS[v] ?? v;
const cell = (n: number | null) => (n === null ? <span className="text-ink-2">{SMALL}</span> : <span className="tabular">{n}</span>);
const pct = (n: number | null) => (n === null ? <span className="text-ink-2">–</span> : <span className="tabular">{n.toLocaleString("de-CH")} %</span>);

async function load(): Promise<AnalyticsOverview | null> {
  try {
    return await analyticsOverview();
  } catch {
    // Schema noch nicht migriert oder Datenbank nicht erreichbar: neutral leer statt Fehlerseite.
    return null;
  }
}

async function Content() {
  await requireStaff([...OPS_ROLES]);
  const data = await load();

  return (
    <div>
      <PageHeader
        eyebrow="Betrieb"
        title="Nutzungsstatistik"
        description="Optionale, standardmässig ausgeschaltete Produktanalytics. Nur Personen mit eigener Einwilligung, nur fünf erlaubte Ereignisse, nur Summen ab zehn Personen."
      />
      <div className="flex flex-col gap-10">
        <OpsSubNav active="nutzung" />
        <Notice tone="neutral" title="Was hier nicht erfasst wird">
          Keine Suchtexte, Pseudonyme, Inhalte, Objekt-, Themen- oder Gruppen-IDs, keine Gesundheitswerte, keine Session-Replays und keine Tracker von
          Dritten. Der zufällige Analysebezug gilt höchstens {data?.windowDays ?? 30} Tage; danach und bei Widerruf löscht der Hintergrundarbeiter die
          Rohdaten. Die Zahlen belegen keine medizinische Wirksamkeit.
        </Notice>

        {!data ? (
          <AdminEmpty icon="activity" title="Statistik nicht verfügbar">
            Die Auswertung ist gerade nicht abrufbar. Prüfe den technischen Status unter «Status und Schalter».
          </AdminEmpty>
        ) : (
          <>
            <section aria-labelledby="basis" className="flex flex-col gap-4">
              <h2 id="basis" className="sr-only">
                Basis
              </h2>
              <StatGrid cols={2}>
                <StatTile
                  label="Personen mit Einwilligung"
                  value={data.consenting ?? SMALL}
                  icon="check-circle"
                  hint="Aktuelle Fassung, Basis der Einwilligungsquote"
                />
                <StatTile label="Auswertungsfenster" value={`${data.windowDays} Tage`} icon="clock" hint="Danach werden Rohdaten gelöscht" />
              </StatGrid>
            </section>

            <AdminSectionBlock
              id="ereignisse"
              title="Ereignisse der letzten 30 Tage"
              description="Personen je Ereignis und je erlaubter Ausprägung. Keine Kombinationen mehrerer Merkmale."
            >
              <Table>
                <caption className="sr-only">Personen je Ereignis und Ausprägung</caption>
                <thead>
                  <tr>
                    <th scope="col">Ereignis</th>
                    <th scope="col">Ausprägung</th>
                    <th scope="col">Personen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.flatMap((e) => [
                    <tr key={e.name}>
                      <th scope="row" className="bg-surface! font-sans! text-base! font-semibold! normal-case! tracking-normal! text-ink!">
                        {label(e.name)}
                      </th>
                      <td className="text-sm text-ink-2">Alle</td>
                      <td>{cell(e.persons)}</td>
                    </tr>,
                    ...e.breakdown.map((b) => (
                      <tr key={`${e.name}-${b.value}`}>
                        <td className="text-sm text-ink-2">
                          <span className="sr-only">{label(e.name)}, </span>
                          {ANALYTICS_DIMENSION[e.name]}
                        </td>
                        <td>{label(b.value)}</td>
                        <td>{cell(b.persons)}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </Table>
            </AdminSectionBlock>

            <AdminSectionBlock
              id="kohorten"
              title="Einstiegskohorten"
              description="Je Kalenderwoche der Einführung: erste nützliche Aktion innerhalb von 7 Tagen und nützliche Aktion in Woche 4. Berechnet vor Ablauf der Rohdaten."
            >
              {data.cohorts.length === 0 ? (
                <AdminEmpty icon="activity" title="Noch keine abgeschlossenen Kohorten">
                  Eine Kohorte ist frühestens 28 Tage nach dem Einstieg vollständig.
                </AdminEmpty>
              ) : (
                <Table>
                  <caption className="sr-only">Einstiegskohorten je Woche</caption>
                  <thead>
                    <tr>
                      <th scope="col">Woche ab</th>
                      <th scope="col">Eingestiegen</th>
                      <th scope="col">Nützliche Aktion ≤ 7 Tage</th>
                      <th scope="col">Anteil</th>
                      <th scope="col">Nach Aktionstyp</th>
                      <th scope="col">Aktiv in Woche 4</th>
                      <th scope="col">Anteil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((c) => (
                      <tr key={c.week}>
                        <td className="tabular whitespace-nowrap">{formatDate(c.week)}</td>
                        <td>{cell(c.entered)}</td>
                        <td>{cell(c.activated7d)}</td>
                        <td>{pct(c.activatedShare)}</td>
                        <td className="text-sm">
                          {c.byType.length === 0
                            ? "–"
                            : c.byType.map((t) => (
                                <span key={t.action} className="block">
                                  {label(t.action)}: {t.persons === null ? SMALL : t.persons}
                                </span>
                              ))}
                        </td>
                        <td>{cell(c.activeWeek4)}</td>
                        <td>{pct(c.week4Share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </AdminSectionBlock>
          </>
        )}
      </div>
    </div>
  );
}
