import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { dateInputValue, DueBadge, OfferStatusBadge, one, StatusNotice } from "@/components/content/admin/common";
import { FlagForm, HideOfferForm, OfferForm, VerifyForm } from "@/components/content/admin/directory-forms";
import { Icon } from "@/components/ui/icon";
import { AdminHeading } from "@/components/admin/ui";
import { Card, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { publishOfferAction } from "@/server/modules/content/directory-actions";
import { getOfferForStaff, offerDueState } from "@/server/modules/content/directory-queries";
import { missingExpertMethods, verifyMethodLabel } from "@/server/modules/content/shared";
import { addMonths, EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Angebot" };

const MESSAGES: Record<string, string> = {
  angelegt: "Angebot als Entwurf angelegt. Erfasse jetzt die Prüfung beim Anbieter.",
  gespeichert: "Änderungen gespeichert.",
  "gespeichert-offline": "Änderungen gespeichert. Das Angebot ist offline, bis du es erneut publizierst.",
  geprueft: "Prüfung erfasst.",
  publiziert: "Angebot publiziert.",
  ausgeblendet: "Angebot ausgeblendet. Öffentlich werden keine Kontaktdaten mehr gezeigt.",
  markiert: "Änderungsflag gesetzt.",
  erledigt: "Hinweis als erledigt markiert.",
};

/** S57 Angebot prüfen, publizieren, ausblenden (CON04, CON05). */
export default function StaffOfferPage({ params, searchParams }: PageProps<"/verwaltung/verzeichnis/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <StaffOffer params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffOffer({
  params,
  searchParams,
}: {
  params: PageProps<"/verwaltung/verzeichnis/[id]">["params"];
  searchParams: PageProps<"/verwaltung/verzeichnis/[id]">["searchParams"];
}) {
  await requireStaff(EDITOR_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await connection();
  const data = await getOfferForStaff(id);
  if (!data) notFound();
  const { offer: o, records } = data;
  const now = new Date();
  const due = offerDueState(o, now);
  // CON05: passende Fachprüfung für medizinische und sozialrechtliche Leistungsangaben
  const missingExpert = missingExpertMethods(o.topicSlugs, records.filter((r) => r.nextDueAt > now).map((r) => r.method));
  const canPublish = o.status !== "published" && due !== "unverified" && due !== "overdue" && missingExpert.length === 0;

  return (
    <>
      <PageHeader
        back={{ href: "/verwaltung/verzeichnis", label: "Verzeichnis" }}
        eyebrow={o.organization}
        title={o.title}
        description={
          <span className="flex flex-wrap items-center gap-2 text-base">
            <OfferStatusBadge status={o.status} />
            <DueBadge state={due} />
            {o.nextReviewAt && <span className="text-sm">nächste Prüfung bis {formatDate(o.nextReviewAt)}</span>}
          </span>
        }
        actions={
          o.status === "published" ? (
            <Link href={`/hilfe/${o.slug}`} className="inline-flex h-12 items-center gap-2 font-semibold text-ink underline underline-offset-4">
              Öffentliche Ansicht <Icon name="arrow-right" className="size-4" />
            </Link>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-10">
        <StatusNotice code={one(sp.status)} messages={MESSAGES} />
        {missingExpert.length > 0 && (
          <Notice tone="warning" icon="shield" title="Fachprüfung erforderlich">
            Für die gewählten Themen braucht es vor der Publikation zusätzlich: {missingExpert.map(verifyMethodLabel).join(", ")} (CON05). Erfasse sie unten
            als eigene Prüfung.
          </Notice>
        )}
        {o.changeFlag && (
          <Notice tone="warning" icon="flag" title="Offener Änderungshinweis">
            {o.changeNote ?? "Bitte das Angebot beim Anbieter prüfen."}{" "}
            <Link href="/verwaltung/verzeichnis?ansicht=hinweise">Hinweise ansehen</Link>
          </Notice>
        )}

        <section aria-labelledby="publikation" className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col items-start gap-4 border-t border-ink pt-4">
            <h2 id="publikation" className="text-lg font-[650] text-ink">
              Publikation
            </h2>
            {o.status === "published" ? (
              <>
                <p className="text-base text-ink-2">Das Angebot ist öffentlich sichtbar. Bei Bedenken kannst du es sofort ausblenden.</p>
                <HideOfferForm offerId={o.id} />
              </>
            ) : (
              <>
                <p className="text-base text-ink-2">
                  {canPublish
                    ? "Die Prüfung ist gültig. Du kannst das Angebot publizieren."
                    : "Vor der Publikation braucht es eine gültige Prüfung beim Anbieter (CON05)."}
                </p>
                {canPublish && (
                  <StatusAction
                    action={publishOfferAction}
                    fields={{ offerId: o.id }}
                    label="Angebot publizieren"
                    variant="primary"
                    pendingText="Wird publiziert …"
                  />
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-4 border-t border-ink pt-4">
            <h2 className="text-lg font-[650] text-ink">Änderungsflag</h2>
            <FlagForm offerId={o.id} flagged={o.changeFlag} note={o.changeNote} />
          </div>
        </section>

        <section aria-labelledby="pruefung" className="flex flex-col gap-5">
          <AdminHeading
            id="pruefung"
            title="Prüfung erfassen"
            description="Angaben beim Anbieter prüfen. Medizinische und sozialrechtliche Leistungsangaben brauchen die passende Fachprüfung."
          />
          <Card>
            <VerifyForm
              target="offer"
              targetId={o.id}
              today={dateInputValue(now)}
              defaultDue={dateInputValue(addMonths(now, 6))}
              maxDue={dateInputValue(addMonths(now, 6))}
              showClearFlag={o.changeFlag}
            />
          </Card>
          {records.length > 0 && (
            <div>
              <Table>
                <caption className="sr-only">Bisherige Prüfungen</caption>
                <thead>
                  <tr>
                    <th scope="col">Geprüft am</th>
                    <th scope="col">Verfahren</th>
                    <th scope="col">Nächste Prüfung</th>
                    <th scope="col">Notiz</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular whitespace-nowrap">{formatDate(r.verifiedAt)}</td>
                      <td className="text-sm">{verifyMethodLabel(r.method)}</td>
                      <td className="tabular whitespace-nowrap">{formatDate(r.nextDueAt)}</td>
                      <td className="text-sm">{r.note ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </section>

        <section aria-labelledby="bearbeiten" className="flex flex-col gap-5">
          <AdminHeading
            id="bearbeiten"
            title="Angaben bearbeiten"
            description={o.status === "published" ? "Nach dem Speichern ist das Angebot offline, bis du es erneut publizierst." : undefined}
          />
          <OfferForm
            offerId={o.id}
            version={o.version}
            defaults={{
              slug: o.slug,
              organization: o.organization,
              title: o.title,
              summary: o.summary,
              description: o.description,
              topicSlugs: o.topicSlugs,
              cantons: o.cantons,
              languages: o.languages,
              audience: o.audience,
              responsibility: o.responsibility,
              access: o.access,
              costNote: o.costNote,
              contactWay: o.contactWay,
              url: o.url,
            }}
          />
        </section>
      </div>
    </>
  );
}
