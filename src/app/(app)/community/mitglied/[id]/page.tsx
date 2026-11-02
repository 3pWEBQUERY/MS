import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, KeyValue, Monogram, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { cantonName, interestLabel } from "@/lib/catalog";
import { requireViewer } from "@/server/auth/viewer";
import { getMemberProfileForViewer } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Mitgliederprofil" };

/**
 * S10 Sichtbares Mitgliederprofil (COM05, «Profilgrenze»): nur Pseudonym, freigegebene Interessen
 * und optional Kanton. Keine E-Mail, kein letzter Login, keine Position. Blockiert → neutrale 404.
 */
export default function MemberProfilePage({ params }: PageProps<"/community/mitglied/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <MemberProfile params={params} />
    </Suspense>
  );
}

async function MemberProfile({ params }: { params: PageProps<"/community/mitglied/[id]">["params"] }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const profile = await getMemberProfileForViewer(viewer, id);
  if (!profile) notFound();
  const canton = cantonName(profile.canton);

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader back={{ href: "/community", label: "Zur Community" }} eyebrow="Mitgliederprofil" title={profile.pseudonym} />
      <div className="flex flex-col gap-6">
        {profile.self && (
          <Notice
            tone="info"
            icon="eye"
            title="So sehen andere dich"
            action={
              <ButtonLink href="/profil" variant="secondary" size="sm" icon={<Icon name="pencil" className="size-4" />}>
                Profil bearbeiten
              </ButtonLink>
            }
          >
            Andere Mitglieder sehen genau diese Angaben. Deine E-Mail-Adresse und dein Tagebuch sind nie Teil des Profils.
          </Notice>
        )}

        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Monogram name={profile.pseudonym} size="lg" />
            {profile.team ? (
              <Badge tone="info" icon="shield">
                Team · {profile.team}
              </Badge>
            ) : (
              <Badge tone="neutral" icon="user">
                Mitglied
              </Badge>
            )}
          </div>
          <KeyValue
            items={[
              [
                "Interessen",
                profile.interests.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {profile.interests.map((i) => (
                      <li key={i}>
                        <Badge>{interestLabel(i)}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-ink-2">Keine Interessen freigegeben</span>
                ),
              ],
              ...(canton ? ([["Kanton", canton]] as [string, string][]) : []),
            ]}
          />
        </Card>

        {!profile.self && (
          <section aria-labelledby="profile-actions" className="flex flex-col gap-3">
            <h2 id="profile-actions" className="sr-only">
              Aktionen
            </h2>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/community/mitglied/${profile.accountId}/anfrage`} icon={<Icon name="user-plus" className="size-5" />}>
                Kontaktanfrage senden
              </ButtonLink>
              <ButtonLink
                href={`/community/blockiert/neu?mitglied=${profile.accountId}`}
                variant="secondary"
                icon={<Icon name="ban" className="size-5" />}
              >
                Blockieren
              </ButtonLink>
              <ButtonLink
                href={`/melden?typ=profile&id=${profile.accountId}`}
                variant="secondary"
                icon={<Icon name="flag" className="size-5" />}
              >
                Melden
              </ButtonLink>
            </div>
            <p className="text-sm text-ink-2">
              Gespräche beginnen erst, wenn beide zugestimmt haben. Eine Anfrage enthält keinen Text.{" "}
              <Link href="/regeln" className="font-medium text-ink underline underline-offset-4">
                Regeln
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
