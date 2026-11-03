import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { dateInputValue, DueBadge, one, StatusNotice } from "@/components/content/admin/common";
import { SafetyContactForm, VerifyForm } from "@/components/content/admin/directory-forms";
import { AdminHeading } from "@/components/admin/ui";
import { Badge, Card, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { setSafetyActiveAction } from "@/server/modules/content/directory-actions";
import { getSafetyContactForStaff, safetyDueState } from "@/server/modules/content/directory-queries";
import { SAFETY_REVIEW_MAX_DAYS, verifyMethodLabel } from "@/server/modules/content/shared";
import { addDaysTo, EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Hilfeweg" };

const MESSAGES: Record<string, string> = {
  angelegt: "Hilfeweg angelegt. Er ist inaktiv, bis er verifiziert und aktiviert ist.",
  gespeichert: "Änderungen gespeichert.",
  "gespeichert-offline": "Der Kontaktweg wurde geändert und ist deshalb offline, bis er erneut verifiziert und aktiviert ist.",
  geprueft: "Verifikation erfasst.",
  aktiviert: "Hilfeweg aktiviert. Er erscheint auf der Sicherheitsseite.",
  deaktiviert: "Hilfeweg deaktiviert.",
};

/** SAF06: Hilfeweg pflegen, verifizieren (monatlich) und aktivieren. */
export default function SafetyContactPage({ params, searchParams }: PageProps<"/verwaltung/verzeichnis/sicherheit/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <SafetyContactDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SafetyContactDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/verwaltung/verzeichnis/sicherheit/[id]">["params"];
  searchParams: PageProps<"/verwaltung/verzeichnis/sicherheit/[id]">["searchParams"];
}) {
  await requireStaff(EDITOR_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await connection();
  const data = await getSafetyContactForStaff(id);
  if (!data) notFound();
  const { contact: c, records } = data;
  const now = new Date();
  const due = safetyDueState(c, now);
  return (
    <>
      <PageHeader
        back={{ href: "/verwaltung/verzeichnis/sicherheit", label: "Sicherheitskontakte" }}
        eyebrow="Sicherheitskontakt"
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2 text-base">
            {c.active ? <Badge tone="success">Aktiv</Badge> : <Badge tone="outline">Inaktiv</Badge>}
            <DueBadge state={due} />
          </span>
        }
      />
      <div className="flex flex-col gap-10">
        <StatusNotice code={one(sp.status)} messages={MESSAGES} />
        {c.active && due === "overdue" && (
          <Notice tone="danger" title="Verifikation überfällig">
            Dieser Hilfeweg ist weiterhin sichtbar, damit keine Notrufnummer fehlt. Bitte verifiziere ihn umgehend (SAF06).
          </Notice>
        )}
        <div className="flex flex-col items-start gap-4 border-t border-ink pt-4">
          <h2 className="text-lg font-[650] text-ink">Sichtbarkeit</h2>
          <p className="text-base text-ink-2">
            {c.verifiedAt ? `Zuletzt verifiziert am ${formatDate(c.verifiedAt)} durch ${c.verifiedBy ?? "–"}.` : "Noch nicht verifiziert."}
          </p>
          {c.active ? (
            <StatusAction
              action={setSafetyActiveAction}
              fields={{ contactId: c.id, active: "" }}
              label="Deaktivieren"
              variant="quiet-danger"
              confirm={{
                title: "Hilfeweg deaktivieren?",
                body: "Der Hilfeweg verschwindet sofort von der öffentlichen Sicherheitsseite.",
                confirmLabel: "Deaktivieren",
                variant: "danger",
              }}
            />
          ) : (
            due !== "unverified" &&
            due !== "overdue" && <StatusAction action={setSafetyActiveAction} fields={{ contactId: c.id, active: "on" }} label="Aktivieren" variant="primary" />
          )}
        </div>
        <section aria-labelledby="verifikation" className="flex flex-col gap-5">
          <AdminHeading id="verifikation" title="Verifikation erfassen" description="Erreichbarkeit und Nummer beim Anbieter bestätigen – vor Publikation und danach monatlich." />
          <Card>
            <VerifyForm
              target="safety"
              targetId={c.id}
              today={dateInputValue(now)}
              defaultDue={dateInputValue(addDaysTo(now, 30))}
              maxDue={dateInputValue(addDaysTo(now, SAFETY_REVIEW_MAX_DAYS))}
            />
          </Card>
          {records.length > 0 && (
            <div>
              <Table>
                <caption className="sr-only">Bisherige Verifikationen</caption>
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
          <AdminHeading id="bearbeiten" title="Angaben bearbeiten" description="Eine geänderte Telefonnummer oder Website gilt als ungeprüft und geht offline, bis sie erneut verifiziert ist." />
          <SafetyContactForm
            contactId={c.id}
            defaults={{ name: c.name, description: c.description, phone: c.phone ?? "", url: c.url ?? "", availability: c.availability, region: c.region, sort: c.sort }}
          />
        </section>
      </div>
    </>
  );
}
