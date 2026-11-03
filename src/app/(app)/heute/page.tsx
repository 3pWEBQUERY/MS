import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
import { RecentEntries } from "@/components/health/recent-entries";
import { getTodayCheckIn } from "@/server/modules/health/queries";
import { resolveMoment, type MomentIntent, type MomentTarget } from "@/lib/moment";
import { getActiveMomentConfig } from "@/server/modules/content/moment";
import { allFlags } from "@/server/flags";
import { requireViewer } from "@/server/auth/viewer";
import { MeinMoment } from "./mein-moment";
import { PartialOperationNotice } from "./partial-operation";

export const metadata: Metadata = { title: "Heute" };

/**
 * S18 Dashboard Heute (HOM01–HOM08, US02):
 * – ohne Daten voll nutzbar, keine Warnpunkte, keine Streaks, keine Tagesziele (HOM01, HOM05)
 * – Mein Moment aus der aktiven, versionierten Regelkonfiguration (HOM02, S19)
 * – Check-in, Neueintrag, Gruppen, Wissen und Hilfe mit einer Aktivierung erreichbar (HOM03)
 * – einfache Ansicht blendet optionale Karten und Metadaten aus (data-optional, HOM06)
 * – Teilbetrieb wird erklärt, abgeschaltete Erfassung nicht angeboten (HOM08, S61)
 */
export default function TodayPage({ searchParams }: PageProps<"/heute">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Today searchParams={searchParams} />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Grüezi";
  return "Guten Abend";
}

const DECLINED_NOTE =
  "Du hast den Gesundheitsbereich nicht aktiviert. Das kannst du jederzeit unter «Privatsphäre» ändern – alle anderen Bereiche stehen dir offen.";
const PAUSED_NOTE =
  "Neue Einträge sind gerade vorübergehend pausiert. Deine bestehenden Einträge findest du weiterhin in Mein MS.";
const EMPTY_NOTE = "Für diese Auswahl gibt es gerade keine Vorschläge. Alle Bereiche erreichst du jederzeit über die Navigation.";

async function Today({ searchParams }: { searchParams: PageProps<"/heute">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const savedCheckIn = sp.gespeichert === "checkin";
  const [flags, config, today] = await Promise.all([
    allFlags(),
    getActiveMomentConfig(),
    viewer.healthActive ? getTodayCheckIn(viewer) : Promise.resolve(null),
  ]);
  const now = new Date();
  const tz = viewer.prefs.timezone;
  const hour = Number(new Intl.DateTimeFormat("de-CH", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const healthDeclined = viewer.healthDecided && !viewer.healthActive;
  const healthWritable = flags.health_write;
  const opts = { healthActive: viewer.healthActive, healthDeclined, healthWritable };
  const targets = Object.fromEntries(
    (["record", "connect", "learn"] as MomentIntent[]).map((k) => [k, resolveMoment(config, k, opts)]),
  ) as Record<MomentIntent, MomentTarget[]>;
  const recordNote = healthDeclined ? DECLINED_NOTE : viewer.healthActive && !healthWritable ? PAUSED_NOTE : EMPTY_NOTE;
  const emptyNotes: Record<MomentIntent, string> = { record: recordNote, connect: EMPTY_NOTE, learn: EMPTY_NOTE };

  // Ohne Entscheidung führt der Check-in zuerst zu S08 und danach direkt weiter (F02).
  const canRecord = !healthDeclined && (!viewer.healthActive || healthWritable);
  const quick: { href: string; label: string; icon: IconName; hide?: boolean }[] = [
    {
      href: today?.href ?? "/mein-ms/check-in",
      label: today?.exists ? "Check-in von heute" : "Check-in",
      icon: "battery",
      hide: !canRecord && !today?.exists,
    },
    { href: "/mein-ms/eintrag/neu", label: "Neuer Eintrag", icon: "plus", hide: !canRecord },
    { href: "/community/gruppen", label: "Gruppen", icon: "users" },
    { href: "/wissen", label: "Wissen", icon: "book" },
    { href: "/hilfe", label: "Hilfe", icon: "lifebuoy" },
  ];

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="eyebrow" data-optional>
          {new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now)}
        </p>
        <h1 className="display-lg">
          {greeting(hour)}, <em>{viewer.pseudonym}</em>
        </h1>
      </header>

      {savedCheckIn && (
        <Notice tone="success" role="status" title="Dein Check-in ist gespeichert.">
          Nur du siehst ihn. Du kannst ihn jederzeit in Mein MS ändern oder löschen.
        </Notice>
      )}

      <PartialOperationNotice flags={flags} />

      <MeinMoment targets={targets} emptyNotes={emptyNotes} />

      <section aria-labelledby="quick">
        <h2 id="quick" className="eyebrow mb-4">
          Schnellzugriff
        </h2>
        <ul className="grid grid-cols-2 border-t border-ink sm:grid-cols-3 lg:grid-cols-5">
          {quick
            .filter((q) => !q.hide)
            .map((q) => (
              <li key={q.label} className="border-b border-line lg:border-b-0 lg:border-r lg:last:border-r-0">
                <Link
                  href={q.href}
                  data-focus-inset
                  className="group flex h-full min-h-24 flex-col justify-between gap-4 px-1 py-4 transition-colors duration-150 hover:bg-raised lg:px-4"
                >
                  <span className="flex items-center justify-between">
                    <Icon name={q.icon} className="size-5 text-accent-ink" />
                    <Icon name="arrow-right" className="nudge size-4 text-ink-3 group-hover:text-ink" />
                  </span>
                  <span className="break-words text-lg font-semibold leading-snug text-ink">{q.label}</span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* Optionale Karte: in der einfachen Ansicht ausgeblendet, Einträge bleiben über Mein MS erreichbar. */}
      <div data-optional>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-[20px]" />}>
          <RecentEntries viewer={viewer} />
        </Suspense>
      </div>
    </div>
  );
}
