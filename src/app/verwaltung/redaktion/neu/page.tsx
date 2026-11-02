import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticleVersionForm } from "@/components/content/admin/article-forms";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { listKnowledgeTopicsForStaff, listMediaOptions } from "@/server/modules/content/editorial-queries";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Artikel anlegen" };

/** S56: neuen Artikel als Entwurf (Version 1) anlegen. */
export default function NewArticlePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <NewArticle />
    </Suspense>
  );
}

async function NewArticle() {
  await requireStaff(EDITOR_ROLES);
  const [topics, media] = await Promise.all([listKnowledgeTopicsForStaff(), listMediaOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/verwaltung/redaktion", label: "Redaktion" }} eyebrow="Redaktion" title="Artikel anlegen" />
      <div className="flex flex-col gap-8">
        <Notice tone="info" title="So geht es weiter">
          Der Artikel startet als Entwurf. Danach fügst du Quellen hinzu und sendest ihn zur Prüfung. Publizieren kannst du erst nach
          einer Freigabe durch eine andere Person.
        </Notice>
        <ArticleVersionForm
          mode="create"
          topics={topics}
          media={media}
          defaults={{ title: "", summary: "", body: "", authorDisplay: "Redaktion MS Plattform", topicId: "", readingMinutes: 4, isMedical: true, coverMediaId: null }}
        />
      </div>
    </>
  );
}
