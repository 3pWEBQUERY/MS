import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardHeading } from "@/components/community/card-heading";
import { ConfirmForm } from "@/components/community/confirm-form";
import { RulesGate } from "@/components/community/rules-gate";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { deletePostAction } from "@/server/modules/community/actions";
import { getOwnPostForEdit, listTopics, POST_MAX, POST_TITLE_MAX } from "@/server/modules/community/queries";
import { EditPostForm } from "./edit-form";

export const metadata: Metadata = { title: "Beitrag bearbeiten" };

/** S32 Beitrag bearbeiten oder löschen (COM03): Zielgruppe unveränderlich, Löschfolgen bestätigen. */
export default function EditPostPage({ params }: PageProps<"/community/beitrag/[id]/bearbeiten">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <EditPost params={params} />
    </Suspense>
  );
}

async function EditPost({ params }: { params: PageProps<"/community/beitrag/[id]/bearbeiten">["params"] }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const post = await getOwnPostForEdit(viewer, id);
  if (!post) notFound();
  const [topics, enabled] = await Promise.all([listTopics(), isEnabled("community_write")]);

  const audience = post.groupTitle
    ? post.groupType === "closed"
      ? `Mitglieder der geschlossenen Gruppe ${post.groupTitle}`
      : `Mitglieder der offenen Gruppe ${post.groupTitle}`
    : "Mitglieder der Plattform";
  const canEdit = enabled && !viewer.writeSuspended && !post.archived;

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader back={{ href: `/community/beitrag/${post.id}`, label: "Zurück zum Beitrag" }} eyebrow="Eigener Beitrag" title="Beitrag bearbeiten" />
      <div className="flex flex-col gap-10">
        <Notice tone="info" icon="eye" title={`Sichtbar für: ${audience}`}>
          Die Zielgruppe bleibt unverändert. Wenn du einen anderen Kreis erreichen möchtest, schreibe einen neuen Beitrag.
        </Notice>

        {post.archived ? (
          <Notice tone="neutral" icon="archive" title="Diese Gruppe ist archiviert">
            Bearbeiten ist nicht mehr möglich. Du kannst deinen Beitrag aber weiterhin löschen.
          </Notice>
        ) : !enabled ? (
          <Notice tone="warning" title="Bearbeiten ist vorübergehend pausiert">
            Löschen bleibt möglich.
          </Notice>
        ) : viewer.writeSuspended ? (
          <Notice tone="neutral" title="Bearbeiten ist für dein Konto im Moment nicht möglich">
            Löschen bleibt möglich.
          </Notice>
        ) : viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION ? (
          <RulesGate version={COMMUNITY_RULES_VERSION} updated={viewer.rulesAcceptedVersion !== null} />
        ) : null}

        {canEdit && viewer.rulesAcceptedVersion === COMMUNITY_RULES_VERSION && (
          <EditPostForm
            post={{ id: post.id, version: post.version, title: post.title ?? "", body: post.body, topic: post.topicSlug }}
            topics={topics.map((t) => ({ value: t.slug, label: t.name }))}
            maxBody={POST_MAX}
            maxTitle={POST_TITLE_MAX}
          />
        )}

        <section aria-labelledby="delete" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
          <CardHeading id="delete" title="Beitrag löschen" />
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-base text-ink-2">
            <li>Der Text wird sofort entfernt und kann nicht wiederhergestellt werden.</li>
            {post.hasComments ? (
              <li>Weil es Antworten gibt, bleibt an seiner Stelle ein neutraler Platzhalter – ohne Text und ohne deinen Namen.</li>
            ) : (
              <li>Der Beitrag verschwindet vollständig aus Feed und Gruppe.</li>
            )}
            <li>Antworten anderer bleiben bestehen und werden dir nicht zugeordnet. Deine eigenen Antworten löschst du einzeln.</li>
          </ul>
          <div>
            <ConfirmForm
              action={deletePostAction}
              hidden={{ postId: post.id }}
              triggerLabel="Beitrag löschen"
              triggerSize="md"
              title="Beitrag endgültig löschen?"
              description={
                post.hasComments
                  ? "Der Text wird sofort entfernt. Die Antworten bleiben unter einem neutralen Platzhalter sichtbar."
                  : "Der Text wird sofort entfernt und kann nicht wiederhergestellt werden."
              }
              confirmLabel="Endgültig löschen"
              pendingText="Wird gelöscht …"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
