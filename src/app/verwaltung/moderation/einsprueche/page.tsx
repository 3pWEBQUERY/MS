import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { APPEAL_STATUS_LABEL, APPEAL_STATUS_TONE, OPERATING_HOURS_NOTE, PRIORITY_TONE } from "@/components/admin/labels";
import { param, query } from "@/components/admin/params";
import { AdminEmpty, AdminSectionBlock, DateTime, Deadline } from "@/components/admin/ui";
import { Badge, PageHeader, PageSkeleton, SegmentNav, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { listAppeals, type AppealScope } from "@/server/modules/moderation/appeals";

export const metadata: Metadata = { title: "Einsprüche" };

/** Einsprüche (SAF05, US20): unabhängige Prüfung, Antwortziel 5 Betriebstage. */
export default function AppealsPage({ searchParams }: PageProps<"/verwaltung/moderation/einsprueche">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

const SCOPES: { value: AppealScope; label: string; leadOnly: boolean }[] = [
  { value: "mine", label: "Mir zur Prüfung zugewiesen", leadOnly: false },
  { value: "open", label: "Alle offenen", leadOnly: true },
  { value: "all", label: "Alle", leadOnly: true },
];

async function Content({ searchParams }: { searchParams: PageProps<"/verwaltung/moderation/einsprueche">["searchParams"] }) {
  const viewer = await requireStaff(["moderator", "moderation_lead"]);
  const sp = await searchParams;
  const lead = viewer.roles.includes("moderation_lead");
  const requested = param(sp.ansicht) as AppealScope;
  const scope: AppealScope = SCOPES.some((s) => s.value === requested && (lead || !s.leadOnly)) ? requested : lead ? "open" : "mine";
  const list = await listAppeals(viewer, scope);
  const now = new Date();
  const base = "/verwaltung/moderation/einsprueche";

  return (
    <div>
      <PageHeader
        back={{ href: "/verwaltung/moderation", label: "Moderationsübersicht" }}
        eyebrow="Moderation"
        title="Einsprüche"
        description="Jeder Einspruch wird von einer anderen zuständigen Person geprüft als der entscheidenden. Vorgeschlagenes Antwortziel: fünf Betriebstage."
      />
      <div className="flex flex-col gap-8">
        {lead && (
          <SegmentNav
            label="Ansicht"
            items={SCOPES.map((s) => ({ href: query(base, { ansicht: s.value }), label: s.label, active: s.value === list.scope }))}
          />
        )}
        <AdminSectionBlock id="liste" title="Einsprüche" description={OPERATING_HOURS_NOTE}>
          {list.rows.length === 0 ? (
            <AdminEmpty icon="check-circle" title="Keine passenden Einsprüche">
              {lead ? "Neue Einsprüche erscheinen hier zur Zuweisung." : "Die Moderationsleitung weist dir Einsprüche zur Prüfung zu."}
            </AdminEmpty>
          ) : (
            <Table>
              <caption className="sr-only">Einsprüche</caption>
              <thead>
                <tr>
                  <th scope="col">Fall</th>
                  <th scope="col">Status</th>
                  <th scope="col">Eingang</th>
                  <th scope="col">Antwortziel</th>
                  <th scope="col">Prüfende Person</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((a) => {
                  const done = a.status === "upheld" || a.status === "overturned";
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${base}/${a.id}`}
                            className="tabular font-mono font-semibold text-ink underline underline-offset-4"
                          >
                            {a.caseNumber}
                          </Link>
                          <Badge tone={PRIORITY_TONE[a.priority]}>{a.priority}</Badge>
                        </div>
                      </td>
                      <td>
                        <Badge tone={APPEAL_STATUS_TONE[a.status]}>{APPEAL_STATUS_LABEL[a.status]}</Badge>
                      </td>
                      <td className="text-sm">
                        <DateTime date={a.createdAt} />
                      </td>
                      <td>
                        {done ? (
                          <span className="text-sm text-ink-2">
                            Entschieden <DateTime date={a.decidedAt} />
                          </span>
                        ) : (
                          <Deadline dueAt={a.answerBy} now={now} total={a.answerBy.getTime() - a.createdAt.getTime()} />
                        )}
                      </td>
                      <td className="text-sm">
                        {a.assignedReviewerId === viewer.accountId ? "Du" : (a.reviewer ?? <span className="text-ink-2">Noch nicht zugewiesen</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </AdminSectionBlock>
      </div>
    </div>
  );
}
