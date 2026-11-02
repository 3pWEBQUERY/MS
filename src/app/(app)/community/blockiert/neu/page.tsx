import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/messaging/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card, Monogram, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { isUuid } from "@/server/modules/messaging/access";
import { blockMemberAction } from "@/server/modules/messaging/actions";
import { getBlockTarget } from "@/server/modules/messaging/blocks";

export const metadata: Metadata = { title: "Person blockieren" };

/** S41 Blockieren bestätigen (SAF01, US17): Folgen erklären, dann sofort wirksam. */
export default function BlockConfirmPage({ searchParams }: PageProps<"/community/blockiert/neu">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <BlockConfirm searchParams={searchParams} />
    </Suspense>
  );
}

const CONSEQUENCES: [IconName, string][] = [
  ["x", "Ein bestehender Kontakt endet sofort, offene Anfragen entfallen."],
  ["lock", "Keine Kontaktanfragen und keine Nachrichten mehr – in beide Richtungen."],
  ["eye-off", "Beiträge und Antworten der Person werden dir im Mitgliederbereich ausgeblendet – und deine ihr."],
  ["shield", "Die Person erfährt nicht, dass du sie blockiert hast."],
  ["flag", "Melden bleibt unabhängig davon möglich, auch für frühere Nachrichten."],
];

async function BlockConfirm({ searchParams }: { searchParams: PageProps<"/community/blockiert/neu">["searchParams"] }) {
  const viewer = await requireViewer();
  const { mitglied } = await searchParams;
  if (!isUuid(mitglied)) notFound();
  const target = await getBlockTarget(viewer, mitglied);
  if (!target) notFound();

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader
        back={{ href: "/community", label: "Zur Community" }}
        eyebrow="Abstand herstellen"
        title={`${target.pseudonym} blockieren?`}
      />
      <div className="flex flex-col gap-8">
        <Card className="flex items-center gap-4">
          <Monogram name={target.pseudonym} size="lg" />
          <p className="text-lg font-semibold text-ink">{target.pseudonym}</p>
        </Card>

        {target.alreadyBlocked ? (
          <Notice
            tone="neutral"
            title="Du hast diese Person bereits blockiert"
            action={
              <ButtonLink href="/community/blockiert" variant="secondary" size="sm">
                Zur Blockierliste
              </ButtonLink>
            }
          />
        ) : (
          <>
            <section aria-labelledby="folgen" className="flex flex-col gap-3">
              <h2 id="folgen" className="text-xl font-[650] text-ink">
                Was Blockieren bewirkt
              </h2>
              <ul className="flex flex-col gap-3 text-base text-ink-2">
                {CONSEQUENCES.map(([icon, text]) => (
                  <li key={text} className="flex items-start gap-3">
                    <Icon name={icon} className="mt-0.5 size-5 shrink-0 text-ink" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-base text-ink-2">
                Du kannst die Blockierung später aufheben. Ein früherer Kontakt wird dadurch nicht wiederhergestellt.
              </p>
            </section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ActionForm
                action={blockMemberAction}
                fields={{ targetId: target.accountId }}
                label="Jetzt blockieren"
                variant="danger"
                size="lg"
                pendingText="Wird blockiert …"
                icon={<Icon name="ban" className="size-5" />}
                showSuccess={false}
              />
              <ButtonLink href={`/melden?typ=profile&id=${target.accountId}`} variant="secondary" size="lg" icon={<Icon name="flag" className="size-5" />}>
                Profil melden
              </ButtonLink>
            </div>
          </>
        )}

        <p className="text-sm text-ink-2">
          Fühlst du dich bedroht? <Link href="/sicherheit" className="font-medium text-ink underline underline-offset-4">Sicherheit und akute Hilfe</Link> · Notruf 144
        </p>
      </div>
    </div>
  );
}
