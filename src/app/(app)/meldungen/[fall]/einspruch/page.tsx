import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppealForm } from "@/components/messaging/appeal-form";
import { Card, KeyValue, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { isUuid } from "@/server/modules/messaging/access";
import { getAppealableCase } from "@/server/modules/moderation/member-cases";

export const metadata: Metadata = { title: "Einspruch erheben" };

/** S43 Einspruch (SAF05, US20): innerhalb von 30 Tagen, auch bei Kontosperre; unabhängige Prüfung. */
export default function AppealPage({ params }: PageProps<"/meldungen/[fall]/einspruch">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Appeal params={params} />
    </Suspense>
  );
}

async function Appeal({ params }: { params: PageProps<"/meldungen/[fall]/einspruch">["params"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const { fall } = await params;
  if (!isUuid(fall)) notFound();
  const decision = await getAppealableCase(viewer, fall);
  if (!decision) notFound();
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader
        back={{ href: "/meldungen", label: "Meine Meldungen" }}
        eyebrow="Einspruch"
        title="Entscheidung überprüfen lassen"
        description="Eine andere zuständige Person, die nicht an der Entscheidung beteiligt war, prüft deinen Einspruch."
      />
      <div className="flex flex-col gap-8">
        <Card>
          <KeyValue
            items={[
              ["Fall", <span key="n" className="font-mono">{decision.caseNumber}</span>],
              ...(decision.decidedAt ? ([["Entschieden am", formatDate(decision.decidedAt, tz)]] as [string, string][]) : []),
              ["Massnahme", decision.actions.map((a) => a.label).join(", ")],
              ...(decision.appealDeadline
                ? ([["Einspruch möglich bis", formatDate(decision.appealDeadline, tz)]] as [string, string][])
                : []),
            ]}
          />
        </Card>

        {decision.canAppeal ? (
          <>
            <AppealForm caseId={decision.caseId} />
            <Notice tone="neutral" title="So geht es weiter">
              Wir streben eine Antwort innerhalb von fünf Betriebstagen an. Den Stand siehst du unter «Meine Meldungen». Die
              Identität meldender Personen wird auch im Einspruch nicht offengelegt.
            </Notice>
          </>
        ) : (
          <Notice tone="neutral" title="Für diesen Fall ist kein Einspruch mehr möglich">
            {decision.appeal
              ? "Du hast bereits Einspruch erhoben."
              : "Die Frist von 30 Tagen ist abgelaufen. Spätere Anliegen kannst du über das Kontaktformular einreichen."}
          </Notice>
        )}
      </div>
    </div>
  );
}
