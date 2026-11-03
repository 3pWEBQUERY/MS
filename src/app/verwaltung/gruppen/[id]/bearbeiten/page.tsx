import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { getGroupForAdmin, listModerators } from "@/server/modules/community/admin-queries";
import { listTopics } from "@/server/modules/community/queries";
import { GroupForm } from "../../group-form";

export const metadata: Metadata = { title: "Gruppe bearbeiten" };

/** S55: Gruppe bearbeiten – nur Administration (COM06, COM08). */
export default function EditGroupPage({ params }: PageProps<"/verwaltung/gruppen/[id]/bearbeiten">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/verwaltung/gruppen/[id]/bearbeiten">["params"] }) {
  await requireStaff(["admin"]);
  const { id } = await params;
  const group = await getGroupForAdmin(id);
  if (!group) notFound();
  const [topics, moderators] = await Promise.all([listTopics(), listModerators()]);
  return (
    <div className="flex flex-col">
      <PageHeader back={{ href: `/verwaltung/gruppen/${group.id}`, label: group.title }} eyebrow="Gruppen" title="Gruppe bearbeiten" />
      <GroupForm
        defaults={{
          id: group.id,
          version: group.version,
          title: group.title,
          slug: group.slug,
          topicId: group.topicId ?? "",
          description: group.description,
          rules: group.rules,
          rulesVersion: group.rulesVersion,
          rulesChangeNote: group.rulesChangeNote ?? "",
          type: group.type,
          discoverable: group.discoverable,
          moderatorAccountId: group.moderatorAccountId ?? "",
        }}
        topics={topics.map((t) => ({ id: t.id, name: t.name }))}
        moderators={moderators}
      />
    </div>
  );
}
