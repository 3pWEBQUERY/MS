import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportForm } from "@/components/messaging/report-form";
import { Icon } from "@/components/ui/icon";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { isUuid } from "@/server/modules/messaging/access";
import { getReportTarget, type ReportTargetType } from "@/server/modules/moderation/reports";

export const metadata: Metadata = { title: "Inhalt melden" };

const TYPES: ReportTargetType[] = ["post", "comment", "profile", "message", "group"];

/**
 * S42 Inhalt melden (SAF02, F06): Grund, optionale Erläuterung, bei Chats bis zu zehn bereits
 * sichtbare Nachrichten. Der Server prüft, dass der Meldende das Ziel sehen darf.
 */
export default function ReportPage({ searchParams }: PageProps<"/melden">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Report searchParams={searchParams} />
    </Suspense>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/melden">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const type = typeof sp.typ === "string" ? (sp.typ as ReportTargetType) : null;
  const id = typeof sp.id === "string" && isUuid(sp.id) ? sp.id : null;
  const conversationId = typeof sp.gespraech === "string" && isUuid(sp.gespraech) ? sp.gespraech : null;
  if (!type || !TYPES.includes(type)) notFound();
  if (type === "message" ? !conversationId : !id) notFound();

  const target = await getReportTarget(viewer, type, id, conversationId);
  if (!target) notFound();

  const tz = viewer.prefs.timezone;
  const fmt = new Intl.DateTimeFormat("de-CH", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const backHref =
    type === "message"
      ? `/community/gespraeche/${target.conversationId}`
      : type === "post"
        ? `/community/beitrag/${target.id}`
        : type === "profile"
          ? `/community/mitglied/${target.id}`
          : type === "group"
            ? "/community/gruppen"
            : "/community";

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader
        back={{ href: backHref, label: "Zurück" }}
        eyebrow="Melden"
        title="Inhalt melden"
        description={target.label}
      />
      <div className="flex flex-col gap-8">
        <p className="flex items-start gap-2 rounded-[16px] bg-danger-soft p-4 text-base text-ink">
          <Icon name="lifebuoy" className="mt-0.5 size-5 shrink-0 text-danger" />
          <span>
            Ist jemand in akuter Gefahr? Ruf sofort den Notruf <a href="tel:144" className="font-semibold underline underline-offset-4">144</a> an.{" "}
            <Link href="/sicherheit" className="font-semibold underline underline-offset-4">
              Sicherheit und akute Hilfe
            </Link>
          </span>
        </p>
        <ReportForm
          type={type}
          id={target.id}
          conversationId={target.conversationId}
          backHref={backHref}
          preselected={type === "message" && id ? id : undefined}
          messages={target.selectable?.map((m) => ({
            id: m.id,
            mine: m.mine,
            body: m.body,
            time: fmt.format(m.createdAt),
            authorLabel: m.authorLabel,
          }))}
        />
      </div>
    </div>
  );
}
