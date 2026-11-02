import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { listModerators } from "@/server/modules/community/admin-queries";
import { listTopics } from "@/server/modules/community/queries";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Neue Gruppe" };

/** S55: Gruppe anlegen – nur Administration (COM06). */
export default function NewGroupPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireStaff(["admin"]);
  const [topics, moderators] = await Promise.all([listTopics(), listModerators()]);
  return (
    <div className="flex flex-col">
      <PageHeader
        back={{ href: "/verwaltung/gruppen", label: "Alle Gruppen" }}
        eyebrow="Gruppen"
        title="Neue Gruppe"
        description="Titel, Thema, Regeln, Zugangstyp und verantwortliche Moderation sind Pflicht."
      />
      <GroupForm
        defaults={{
          title: "",
          slug: "",
          topicId: "",
          description: "",
          rules: "",
          rulesVersion: "1",
          type: "",
          discoverable: true,
          moderatorAccountId: "",
        }}
        topics={topics.map((t) => ({ id: t.id, name: t.name }))}
        moderators={moderators}
      />
    </div>
  );
}
