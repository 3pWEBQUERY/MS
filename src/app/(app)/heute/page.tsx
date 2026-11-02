import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
import { RecentEntries } from "@/components/health/recent-entries";
import { getTodayCheckIn } from "@/server/modules/health/queries";
import { resolveMoment, type MomentIntent } from "@/lib/moment";
import { getActiveMomentConfig } from "@/server/modules/content/moment";
import { requireViewer } from "@/server/auth/viewer";
import { MeinMoment } from "./mein-moment";

export const metadata: Metadata = { title: "Heute" };

/** S18 Dashboard Heute (HOM01–HOM05): ohne Daten voll nutzbar, keine Warnpunkte, keine Streaks. */
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

async function Today({ searchParams }: { searchParams: PageProps<"/heute">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const savedCheckIn = sp.gespeichert === "checkin";
  const today = viewer.healthActive ? await getTodayCheckIn(viewer) : null;
  const hour = Number(new Intl.DateTimeFormat("de-CH", { hour: "numeric", hourCycle: "h23", timeZone: viewer.prefs.timezone }).format(new Date()));
  const healthDeclined = viewer.healthDecided && !viewer.healthActive;
  const opts = { healthActive: viewer.healthActive, healthDeclined };
  const config = await getActiveMomentConfig();
  const targets = Object.fromEntries(
    (["record", "connect", "learn"] as MomentIntent[]).map((k) => [k, resolveMoment(config, k, opts)]),
  ) as Record<MomentIntent, ReturnType<typeof resolveMoment>>;

  const quick: { href: string; label: string; icon: IconName; hide?: boolean }[] = [
    {
      href: today ? today.href : "/mein-ms",
      label: today?.exists ? "Check-in von heute" : "Check-in",
      icon: "battery",
      hide: healthDeclined,
    },
    { href: viewer.healthActive ? "/mein-ms/eintrag/neu" : "/mein-ms", label: "Neuer Eintrag", icon: "plus", hide: healthDeclined },
    { href: "/community/gruppen", label: "Gruppen", icon: "users" },
    { href: "/wissen", label: "Wissen", icon: "book" },
    { href: "/hilfe", label: "Hilfe", icon: "lifebuoy" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-base text-ink-2">
          {new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "numeric", month: "long", timeZone: viewer.prefs.timezone }).format(new Date())}
        </p>
        <h1 className="text-3xl font-[650] tracking-[-0.025em] sm:text-[2.5rem]">
          {greeting(hour)}, {viewer.pseudonym}
        </h1>
      </header>

      {savedCheckIn && (
        <Notice tone="success" role="status" title="Dein Check-in ist gespeichert.">
          Nur du siehst ihn. Du kannst ihn jederzeit in Mein MS ändern oder löschen.
        </Notice>
      )}

      <MeinMoment
        targets={targets}
        healthNote="Du hast den Gesundheitsbereich nicht aktiviert. Das kannst du jederzeit unter «Privatsphäre» ändern – alle anderen Bereiche stehen dir offen."
      />

      <section aria-labelledby="quick">
        <h2 id="quick" className="mb-4 text-xl font-[650]">
          Schnellzugriff
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {quick
            .filter((q) => !q.hide)
            .map((q) => (
              <li key={q.label}>
                <Link
                  href={q.href}
                  className="flex h-full min-h-24 flex-col justify-between gap-3 rounded-[20px] border border-line bg-surface p-4 transition-colors hover:border-line-2 hover:bg-raised"
                >
                  <Icon name={q.icon} className="size-6 text-ink" />
                  <span className="font-semibold text-ink">{q.label}</span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-[20px]" />}>
        <RecentEntries viewer={viewer} />
      </Suspense>
    </div>
  );
}
