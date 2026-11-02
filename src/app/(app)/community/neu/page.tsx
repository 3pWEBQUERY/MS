import type { Metadata } from "next";
import { Suspense } from "react";
import { RulesGate } from "@/components/community/rules-gate";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { listTopics, listWritableGroups, POST_MAX, POST_TITLE_MAX } from "@/server/modules/community/queries";
import { PostForm, type TargetOption } from "./post-form";

export const metadata: Metadata = { title: "Beitrag schreiben" };

/** S30 Beitrag erstellen (COM02, SAF07): Thema, Text, ausdrücklicher Zielbereich, Vorschau. */
export default function NewPostPage({ searchParams }: PageProps<"/community/neu">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <NewPost searchParams={searchParams} />
    </Suspense>
  );
}

async function NewPost({ searchParams }: { searchParams: PageProps<"/community/neu">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const groupSlug = typeof sp.gruppe === "string" ? sp.gruppe : null;
  const [enabled, topics, writable] = await Promise.all([
    isEnabled("community_write"),
    listTopics(),
    listWritableGroups(viewer),
  ]);
  const fromGroup = writable.find((g) => g.slug === groupSlug) ?? null;
  const back = fromGroup
    ? { href: `/community/gruppen/${fromGroup.slug}`, label: `Zurück zur Gruppe ${fromGroup.title}` }
    : { href: "/community", label: "Zurück zur Community" };

  const header = (
    <PageHeader
      back={back}
      eyebrow="Community"
      title="Beitrag schreiben"
      description="Stelle eine Frage oder teile eine Erfahrung. Du wählst selbst, wer deinen Beitrag sehen kann."
    />
  );

  if (!enabled)
    return (
      <div className="max-w-2xl">
        {header}
        <Notice tone="warning" title="Schreiben ist vorübergehend pausiert">
          Neue Beiträge sind im Moment nicht möglich. Lesen bleibt möglich, bestehende Inhalte bleiben erhalten.
        </Notice>
      </div>
    );

  if (viewer.writeSuspended)
    return (
      <div className="max-w-2xl">
        {header}
        <Notice tone="neutral" title="Schreiben ist für dein Konto im Moment nicht möglich">
          Du kannst die Community weiterhin lesen. Hinweise zur Entscheidung und zum Einspruch findest du in deinen
          Mitteilungen.
        </Notice>
      </div>
    );

  if (viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION)
    return (
      <div className="max-w-2xl">
        {header}
        <RulesGate version={COMMUNITY_RULES_VERSION} updated={viewer.rulesAcceptedVersion !== null} />
      </div>
    );

  // «Sichtbarkeit vor Veröffentlichung»: Zielbereich ausdrücklich benannt.
  const targets: TargetOption[] = [
    {
      value: "platform",
      label: "Mitglieder der Plattform",
      description: "Alle angemeldeten Mitglieder können den Beitrag lesen. Nicht öffentlich, nicht für Suchmaschinen.",
    },
    ...writable.map((g) => {
      const outdated = g.acceptedVersion !== g.rulesVersion;
      return {
        value: g.id,
        label: g.type === "closed" ? `Mitglieder dieser geschlossenen Gruppe: ${g.title}` : `Mitglieder dieser offenen Gruppe: ${g.title}`,
        description: outdated
          ? "Die Gruppenregeln wurden aktualisiert. Bitte bestätige sie zuerst im Gruppenraum."
          : g.type === "closed"
            ? "Nur aufgenommene Mitglieder dieser Gruppe sehen den Beitrag."
            : "Nur Mitglieder dieser Gruppe sehen den Beitrag. Beitreten können alle angemeldeten Mitglieder.",
        disabled: outdated,
      };
    }),
  ];
  const groupTopic = fromGroup?.topicId ? topics.find((t) => t.id === fromGroup.topicId)?.slug : undefined;

  return (
    <div className="max-w-2xl">
      {header}
      <PostForm
        topics={topics.map((t) => ({ value: t.slug, label: t.name }))}
        targets={targets}
        defaults={{ topic: groupTopic, target: fromGroup && fromGroup.acceptedVersion === fromGroup.rulesVersion ? fromGroup.id : undefined }}
        maxBody={POST_MAX}
        maxTitle={POST_TITLE_MAX}
      />
    </div>
  );
}
