import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleCardLink } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { getKnowledgeTopic, listPublicArticles } from "@/server/modules/content/articles";

export async function generateMetadata({ params }: PageProps<"/wissen/thema/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getKnowledgeTopic(slug);
  return topic ? { title: `${topic.name} – Wissen`, description: topic.description } : { title: "Wissen" };
}

/** Artikel eines Themas (S44, CON01). */
export default function TopicPage({ params }: PageProps<"/wissen/thema/[slug]">) {
  return (
    <PageContainer>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <TopicContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function TopicContent({ params }: { params: PageProps<"/wissen/thema/[slug]">["params"] }) {
  const { slug } = await params;
  const topic = await getKnowledgeTopic(slug);
  if (!topic) notFound();
  const articles = await listPublicArticles({ topicSlug: slug });
  return (
    <>
      <PageHeader back={{ href: "/wissen", label: "Wissen" }} eyebrow="Thema" title={topic.name} description={topic.description} />
      {articles.length === 0 ? (
        <EmptyState
          icon="book"
          title="Zu diesem Thema ist gerade kein Artikel verfügbar"
          action={
            <ButtonLink href="/wissen" variant="secondary">
              Alle Themen ansehen
            </ButtonLink>
          }
        >
          Artikel, deren Prüftermin abgelaufen ist, werden vorübergehend zurückgezogen und nach erneuter Prüfung wieder
          publiziert.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <li key={a.id}>
              <ArticleCardLink article={a} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
