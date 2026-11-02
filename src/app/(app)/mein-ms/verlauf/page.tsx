import type { Metadata } from "next";
import { Suspense } from "react";
import { buildHistoryRows } from "@/components/health/history-rows";
import { HistoryView } from "@/components/health/history-view";
import { RangeForm } from "@/components/health/range-form";
import { EmptyState, Notice, PageHeader, PageSkeleton, SegmentNav } from "@/components/ui/primitives";
import { formatDate, localDateString } from "@/lib/time";
import { requireHealthViewer } from "@/server/modules/health/guard";
import { getHistory } from "@/server/modules/health/queries";
import { resolveRange } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Verlauf" };

/** S25 Verlauf und Datentabelle (DIA06, DIA07, US06, US08). */
export default function HistoryPage({ searchParams }: PageProps<"/mein-ms/verlauf">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <History searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function History({ searchParams }: { searchParams: PageProps<"/mein-ms/verlauf">["searchParams"] }) {
  const viewer = await requireHealthViewer();
  const sp = await searchParams;
  const today = localDateString(new Date(), viewer.prefs.timezone);
  const range = resolveRange({ zeitraum: one(sp.zeitraum), von: one(sp.von), bis: one(sp.bis) }, today);
  const data = await getHistory(viewer, range.from, range.to);
  const rows = buildHistoryRows(data, range.from);
  const rangeLabel =
    range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} bis ${formatDate(range.to)}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Verlauf"
        description="Selbst dokumentierte Beobachtungen"
        back={{ href: "/mein-ms", label: "Mein MS" }}
      />
      {/* DIA07: keine Interpretation, kein Score, keine Schwellen */}
      <Notice tone="neutral" title="Selbst dokumentierte Beobachtungen">
        Hier siehst du deine eigenen Angaben als Einzelwerte – ohne Bewertung, Glättung oder Prognose. Energie, Stimmung und
        Fatigue werden nicht zusammengerechnet. Tage ohne Eintrag bleiben leer.
      </Notice>

      <div className="flex flex-col gap-4">
        <SegmentNav
          label="Zeitraum"
          items={[
            { href: "/mein-ms/verlauf", label: "7 Tage", active: range.preset === "7" },
            { href: "/mein-ms/verlauf?zeitraum=30", label: "30 Tage", active: range.preset === "30" },
            {
              href: `/mein-ms/verlauf?zeitraum=eigen&von=${range.from}&bis=${range.to}`,
              label: "Eigener Zeitraum",
              active: range.preset === "eigen",
            },
          ]}
        />
        {range.preset === "eigen" && (
          <RangeForm
            von={one(sp.von) ?? range.from}
            bis={one(sp.bis) ?? range.to}
            max={today}
            error={range.error}
          />
        )}
        <p className="text-base text-ink-2" aria-live="polite">
          {range.error ? `${range.error} Angezeigt werden die letzten 30 Tage: ` : "Zeitraum: "}
          <strong className="font-semibold text-ink">{rangeLabel}</strong>
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="table" title="In diesem Zeitraum gibt es keine Einträge">
          Wähle einen anderen Zeitraum oder halte etwas fest, wenn du magst.
        </EmptyState>
      ) : (
        <HistoryView rows={rows} days={range.days} from={range.from} />
      )}
    </div>
  );
}
